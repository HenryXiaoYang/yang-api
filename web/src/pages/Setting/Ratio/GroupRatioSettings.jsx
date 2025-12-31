/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Button, Col, Form, Row, Spin, Card, RadioGroup, Radio, Typography } from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
  verifyJSON,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';
import DynamicGroupRatioEditor from './DynamicGroupRatioEditor';

const { Text } = Typography;

export default function GroupRatioSettings(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [ratioMode, setRatioMode] = useState('static'); // 'static' or 'dynamic'
  const [inputs, setInputs] = useState({
    GroupRatio: '',
    UserUsableGroups: '',
    GroupGroupRatio: '',
    'group_ratio_setting.group_special_usable_group': '',
    AutoGroups: '',
    DefaultUseAutoGroup: false,
    DynamicGroupRatioSetting: '',
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  // Extract available groups from GroupRatio
  const availableGroups = useMemo(() => {
    try {
      const parsed = JSON.parse(inputs.GroupRatio || '{}');
      return Object.keys(parsed);
    } catch (e) {
      return [];
    }
  }, [inputs.GroupRatio]);

  // Determine ratio mode from DynamicGroupRatioSetting
  useEffect(() => {
    try {
      const dynamicConfig = JSON.parse(inputs.DynamicGroupRatioSetting || '{}');
      if (dynamicConfig.enabled && dynamicConfig.mode && dynamicConfig.mode !== 'none') {
        setRatioMode('dynamic');
      } else {
        setRatioMode('static');
      }
    } catch (e) {
      setRatioMode('static');
    }
  }, [inputs.DynamicGroupRatioSetting]);

  const handleRatioModeChange = (e) => {
    const newMode = e.target.value;
    setRatioMode(newMode);

    // Update DynamicGroupRatioSetting based on mode
    try {
      const currentConfig = JSON.parse(inputs.DynamicGroupRatioSetting || '{}');
      if (newMode === 'dynamic') {
        currentConfig.enabled = true;
        if (!currentConfig.mode || currentConfig.mode === 'none') {
          currentConfig.mode = 'time';
        }
      } else {
        currentConfig.enabled = false;
      }
      setInputs({ ...inputs, DynamicGroupRatioSetting: JSON.stringify(currentConfig, null, 2) });
    } catch (e) {
      if (newMode === 'dynamic') {
        setInputs({
          ...inputs,
          DynamicGroupRatioSetting: JSON.stringify({
            enabled: true,
            mode: 'time',
            rpm_window_minutes: 1,
            group_configs: {},
          }, null, 2),
        });
      } else {
        setInputs({
          ...inputs,
          DynamicGroupRatioSetting: JSON.stringify({ enabled: false, mode: 'none' }, null, 2),
        });
      }
    }
  };

  async function onSubmit() {
    try {
      await refForm.current
        .validate()
        .then(() => {
          const updateArray = compareObjects(inputs, inputsRow);
          if (!updateArray.length)
            return showWarning(t('你似乎并没有修改什么'));

          const requestQueue = updateArray.map((item) => {
            const value =
              typeof inputs[item.key] === 'boolean'
                ? String(inputs[item.key])
                : inputs[item.key];
            return API.put('/api/option/', { key: item.key, value });
          });

          setLoading(true);
          Promise.all(requestQueue)
            .then((res) => {
              if (res.includes(undefined)) {
                return showError(
                  requestQueue.length > 1
                    ? t('部分保存失败，请重试')
                    : t('保存失败'),
                );
              }

              for (let i = 0; i < res.length; i++) {
                if (!res[i].data.success) {
                  return showError(res[i].data.message);
                }
              }

              showSuccess(t('保存成功'));
              props.refresh();
            })
            .catch((error) => {
              console.error('Unexpected error:', error);
              showError(t('保存失败，请重试'));
            })
            .finally(() => {
              setLoading(false);
            });
        })
        .catch(() => {
          showError(t('请检查输入'));
        });
    } catch (error) {
      showError(t('请检查输入'));
      console.error(error);
    }
  }

  useEffect(() => {
    const currentInputs = {
      GroupRatio: '',
      UserUsableGroups: '',
      GroupGroupRatio: '',
      'group_ratio_setting.group_special_usable_group': '',
      AutoGroups: '',
      DefaultUseAutoGroup: false,
      DynamicGroupRatioSetting: '',
    };
    for (let key in props.options) {
      if (Object.keys(currentInputs).includes(key)) {
        currentInputs[key] = props.options[key];
      }
    }
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    refForm.current.setValues(currentInputs);
  }, [props.options]);

  return (
    <Spin spinning={loading}>
      <Form
        values={inputs}
        getFormApi={(formAPI) => (refForm.current = formAPI)}
        style={{ marginBottom: 15 }}
      >
        {/* Ratio Mode Switch */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ marginRight: 16 }}>{t('分组倍率模式')}</Text>
            <RadioGroup
              type='button'
              value={ratioMode}
              onChange={handleRatioModeChange}
            >
              <Radio value='static'>{t('静态倍率')}</Radio>
              <Radio value='dynamic'>{t('动态倍率')}</Radio>
            </RadioGroup>
          </div>
          <Text type='tertiary'>
            {ratioMode === 'static'
              ? t('静态倍率：每个分组使用固定的倍率值')
              : t('动态倍率：根据时间段或用户请求频率自动调整倍率')}
          </Text>
        </Card>

        {/* Static Ratio Settings */}
        {ratioMode === 'static' && (
          <>
            <Row gutter={16}>
              <Col xs={24} sm={16}>
                <Form.TextArea
                  label={t('分组倍率')}
                  placeholder={t('为一个 JSON 文本，键为分组名称，值为倍率')}
                  extraText={t(
                    '分组倍率设置，可以在此处新增分组或修改现有分组的倍率，格式为 JSON 字符串，例如：{"vip": 0.5, "test": 1}，表示 vip 分组的倍率为 0.5，test 分组的倍率为 1',
                  )}
                  field={'GroupRatio'}
                  autosize={{ minRows: 6, maxRows: 12 }}
                  trigger='blur'
                  stopValidateWithError
                  rules={[
                    {
                      validator: (rule, value) => verifyJSON(value),
                      message: t('不是合法的 JSON 字符串'),
                    },
                  ]}
                  onChange={(value) => setInputs({ ...inputs, GroupRatio: value })}
                />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={16}>
                <Form.TextArea
                  label={t('分组特殊倍率')}
                  placeholder={t('为一个 JSON 文本')}
                  extraText={t(
                    '键为分组名称，值为另一个 JSON 对象，键为分组名称，值为该分组的用户的特殊分组倍率，例如：{"vip": {"default": 0.5, "test": 1}}，表示 vip 分组的用户在使用default分组的令牌时倍率为0.5，使用test分组时倍率为1',
                  )}
                  field={'GroupGroupRatio'}
                  autosize={{ minRows: 6, maxRows: 12 }}
                  trigger='blur'
                  stopValidateWithError
                  rules={[
                    {
                      validator: (rule, value) => verifyJSON(value),
                      message: t('不是合法的 JSON 字符串'),
                    },
                  ]}
                  onChange={(value) =>
                    setInputs({ ...inputs, GroupGroupRatio: value })
                  }
                />
              </Col>
            </Row>
          </>
        )}

        {/* Dynamic Ratio Settings */}
        {ratioMode === 'dynamic' && (
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} sm={16}>
                <Form.TextArea
                  label={t('分组倍率（用于定义可用分组）')}
                  placeholder={t('为一个 JSON 文本，键为分组名称，值为倍率')}
                  extraText={t(
                    '定义可用的分组列表，动态倍率将基于这些分组进行配置。格式：{"default": 1, "vip": 1}',
                  )}
                  field={'GroupRatio'}
                  autosize={{ minRows: 4, maxRows: 8 }}
                  trigger='blur'
                  stopValidateWithError
                  rules={[
                    {
                      validator: (rule, value) => verifyJSON(value),
                      message: t('不是合法的 JSON 字符串'),
                    },
                  ]}
                  onChange={(value) => setInputs({ ...inputs, GroupRatio: value })}
                />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col xs={24} sm={20}>
                <DynamicGroupRatioEditor
                  value={inputs.DynamicGroupRatioSetting}
                  onChange={(value) =>
                    setInputs({ ...inputs, DynamicGroupRatioSetting: value })
                  }
                  availableGroups={availableGroups}
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* Common Settings */}
        <Row gutter={16}>
          <Col xs={24} sm={16}>
            <Form.TextArea
              label={t('用户可选分组')}
              placeholder={t('为一个 JSON 文本，键为分组名称，值为分组描述')}
              extraText={t(
                '用户新建令牌时可选的分组，格式为 JSON 字符串，例如：{"vip": "VIP 用户", "test": "测试"}，表示用户可以选择 vip 分组和 test 分组',
              )}
              field={'UserUsableGroups'}
              autosize={{ minRows: 6, maxRows: 12 }}
              trigger='blur'
              stopValidateWithError
              rules={[
                {
                  validator: (rule, value) => verifyJSON(value),
                  message: t('不是合法的 JSON 字符串'),
                },
              ]}
              onChange={(value) =>
                setInputs({ ...inputs, UserUsableGroups: value })
              }
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={16}>
            <Form.TextArea
              label={t('分组特殊可用分组')}
              placeholder={t('为一个 JSON 文本')}
              extraText={t(
                '键为用户分组名称，值为操作映射对象。内层键以"+:"开头表示添加指定分组（键值为分组名称，值为描述），以"-:"开头表示移除指定分组（键值为分组名称），不带前缀的键直接添加该分组。例如：{"vip": {"+:premium": "高级分组", "special": "特殊分组", "-:default": "默认分组"}}，表示 vip 分组的用户可以使用 premium 和 special 分组，同时移除 default 分组的访问权限',
              )}
              field={'group_ratio_setting.group_special_usable_group'}
              autosize={{ minRows: 6, maxRows: 12 }}
              trigger='blur'
              stopValidateWithError
              rules={[
                {
                  validator: (rule, value) => verifyJSON(value),
                  message: t('不是合法的 JSON 字符串'),
                },
              ]}
              onChange={(value) =>
                setInputs({ ...inputs, 'group_ratio_setting.group_special_usable_group': value })
              }
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={16}>
            <Form.TextArea
              label={t('自动分组auto，从第一个开始选择')}
              placeholder={t('为一个 JSON 文本')}
              field={'AutoGroups'}
              autosize={{ minRows: 6, maxRows: 12 }}
              trigger='blur'
              stopValidateWithError
              rules={[
                {
                  validator: (rule, value) => {
                    if (!value || value.trim() === '') {
                      return true; // Allow empty values
                    }

                    // First check if it's valid JSON
                    try {
                      const parsed = JSON.parse(value);

                      // Check if it's an array
                      if (!Array.isArray(parsed)) {
                        return false;
                      }

                      // Check if every element is a string
                      return parsed.every((item) => typeof item === 'string');
                    } catch (error) {
                      return false;
                    }
                  },
                  message: t('必须是有效的 JSON 字符串数组，例如：["g1","g2"]'),
                },
              ]}
              onChange={(value) => setInputs({ ...inputs, AutoGroups: value })}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={16}>
            <Form.Switch
              label={t(
                '创建令牌默认选择auto分组，初始令牌也将设为auto（否则留空，为用户默认分组）',
              )}
              field={'DefaultUseAutoGroup'}
              onChange={(value) =>
                setInputs({ ...inputs, DefaultUseAutoGroup: value })
              }
            />
          </Col>
        </Row>
      </Form>
      <Button onClick={onSubmit}>{t('保存分组倍率设置')}</Button>
    </Spin>
  );
}
