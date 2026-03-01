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

import React, { useEffect, useRef, useState } from 'react';
import {
  Banner,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spin,
} from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import {
  API,
  compareObjects,
  showError,
  showSuccess,
  showWarning,
} from '../../helpers';

const toStringValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

const toBooleanValue = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === null || value === undefined) {
    return false;
  }
  const normalizedValue = String(value).trim().toLowerCase();
  return normalizedValue === 'true' || normalizedValue === '1';
};

const UserControlSetting = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    user_control_enabled: false,
    rapid_switch_threshold: '3',
    rapid_switch_duration: '300',
    hopping_threshold: '3',
    hopping_duration: '30',
  });
  const [inputsRow, setInputsRow] = useState(inputs);
  const refForm = useRef();

  const getOptions = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/option/');
      const { success, message, data } = res.data;
      if (!success) {
        showError(message || t('获取配置失败'));
        return;
      }
      const currentInputs = { ...inputs };
      data.forEach((item) => {
        if (Object.prototype.hasOwnProperty.call(currentInputs, item.key)) {
          if (item.key === 'user_control_enabled') {
            currentInputs[item.key] = toBooleanValue(item.value);
          } else {
            currentInputs[item.key] = toStringValue(item.value);
          }
        }
      });
      setInputs(currentInputs);
      setInputsRow(structuredClone(currentInputs));
      refForm.current?.setValues(currentInputs);
    } catch (error) {
      showError(error.message || t('获取配置失败'));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = () => {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) {
      return showWarning(t('你似乎并没有修改什么'));
    }
    const requestQueue = updateArray.map((item) =>
      API.put('/api/option/', {
        key: item.key,
        value:
          item.key === 'user_control_enabled'
            ? inputs[item.key]
              ? 'true'
              : 'false'
            : inputs[item.key],
      }),
    );
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (requestQueue.length === 1) {
          if (res.includes(undefined)) return;
        } else if (requestQueue.length > 1) {
          if (res.includes(undefined)) {
            return showError(t('部分保存失败，请重试'));
          }
        }
        showSuccess(t('保存成功'));
        getOptions().then();
      })
      .catch(() => {
        showError(t('保存失败，请重试'));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const clearAllFingerprints = () => {
    Modal.confirm({
      title: t('确认清除所有指纹记录'),
      content: t('该操作将永久删除全部 TLS 指纹记录，且无法恢复。'),
      okText: t('确认清除'),
      okButtonProps: { type: 'danger' },
      cancelText: t('取消'),
      onOk: async () => {
        setLoading(true);
        try {
          const res = await API.delete('/api/user/tls-control/fingerprints');
          const { success, message } = res.data;
          if (!success) {
            showError(message || t('操作失败'));
            return;
          }
          showSuccess(t('已清除所有指纹记录'));
        } catch (error) {
          showError(error.message || t('操作失败'));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const unbanAllUsers = () => {
    Modal.confirm({
      title: t('确认解封所有用户'),
      content: t('该操作会将所有被禁用用户恢复为启用状态，请谨慎执行。'),
      okText: t('确认解封'),
      okButtonProps: { type: 'danger' },
      cancelText: t('取消'),
      onOk: async () => {
        setLoading(true);
        try {
          const res = await API.post('/api/user/tls-control/unban-all');
          const { success, message } = res.data;
          if (!success) {
            showError(message || t('操作失败'));
            return;
          }
          showSuccess(t('已解封所有用户'));
        } catch (error) {
          showError(error.message || t('操作失败'));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  useEffect(() => {
    getOptions().then();
  }, []);

  return (
    <Spin spinning={loading} size='large'>
      <Card style={{ marginTop: '10px' }}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('用户封控设置')}>
            <Form.Switch
              field='user_control_enabled'
              label={t('启用用户封控功能')}
              checkedText='｜'
              uncheckedText='〇'
              checked={inputs.user_control_enabled}
              onChange={(value) =>
                setInputs((prev) => ({
                  ...prev,
                  user_control_enabled: Boolean(value),
                }))
              }
              helpText={t('关闭后仍会采集 TLS 指纹数据，但封控功能不会生效')}
              style={{ marginBottom: 8 }}
            />
            <Banner
              type='info'
              description={t(
                '配置 IP 切换检测阈值，用于识别 IP 频繁切换与 IP 跳跃风险账号',
              )}
              style={{ marginBottom: 16 }}
            />
            <Row gutter={16}>
              <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                <Form.InputNumber
                  field='rapid_switch_threshold'
                  label={t('快速切换次数阈值')}
                  min={1}
                  step={1}
                  suffix={t('次')}
                  extraText={t('快速切换 IP 次数达到该值后触发判断')}
                  onChange={(value) =>
                    setInputs((prev) => ({
                      ...prev,
                      rapid_switch_threshold: toStringValue(value),
                    }))
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                <Form.InputNumber
                  field='rapid_switch_duration'
                  label={t('快速切换停留阈值')}
                  min={1}
                  step={1}
                  suffix={t('秒')}
                  extraText={t('平均停留时长低于该值判定为快速切换')}
                  onChange={(value) =>
                    setInputs((prev) => ({
                      ...prev,
                      rapid_switch_duration: toStringValue(value),
                    }))
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                <Form.InputNumber
                  field='hopping_threshold'
                  label={t('IP 跳跃次数阈值')}
                  min={1}
                  step={1}
                  suffix={t('次')}
                  extraText={t('真实 IP 切换次数达到该值后触发判断')}
                  onChange={(value) =>
                    setInputs((prev) => ({
                      ...prev,
                      hopping_threshold: toStringValue(value),
                    }))
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                <Form.InputNumber
                  field='hopping_duration'
                  label={t('IP 跳跃停留阈值')}
                  min={1}
                  step={1}
                  suffix={t('秒')}
                  extraText={t('平均停留时长低于该值判定为 IP 跳跃')}
                  onChange={(value) =>
                    setInputs((prev) => ({
                      ...prev,
                      hopping_duration: toStringValue(value),
                    }))
                  }
                />
              </Col>
            </Row>
            <Row style={{ marginTop: 16 }}>
              <Button type='primary' onClick={onSubmit}>
                {t('保存用户封控设置')}
              </Button>
            </Row>
            <Row style={{ marginTop: 24 }}>
              <Banner
                type='danger'
                description={t('以下操作不可逆，执行前请再次确认')}
                style={{ width: '100%', marginBottom: 12 }}
              />
              <div className='flex flex-wrap gap-2'>
                <Button type='danger' onClick={clearAllFingerprints}>
                  {t('清除所有指纹记录')}
                </Button>
                <Button type='danger' onClick={unbanAllUsers}>
                  {t('解封所有用户')}
                </Button>
              </div>
            </Row>
          </Form.Section>
        </Form>
      </Card>
    </Spin>
  );
};

export default UserControlSetting;
