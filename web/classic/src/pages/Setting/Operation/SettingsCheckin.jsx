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

import React, { useEffect, useState, useRef } from 'react';
import { Button, Col, Form, Row, Spin, Typography } from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

export default function SettingsCheckin(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  // 默认值定义
  const defaultInputs = {
    'checkin_setting.enabled': false,
    'checkin_setting.min_quota': 1000,
    'checkin_setting.max_quota': 10000,
    'pow_setting.enabled': false,
    'pow_setting.mode': 'replace',
    'pow_setting.difficulty': 18,
    'pow_setting.challenge_ttl': 10,
  };

  const [inputs, setInputs] = useState(defaultInputs);
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(defaultInputs);

  // PoW 模式选项
  const powModeOptions = [
    { value: 'replace', label: t('替代模式') + ' - ' + t('PoW 完全替代 Turnstile') },
    { value: 'supplement', label: t('补充模式') + ' - ' + t('PoW 和 Turnstile 都需要') },
    { value: 'fallback', label: t('回退模式') + ' - ' + t('Turnstile 不可用时使用 PoW') },
  ];

  function handleFieldChange(fieldName) {
    return (value) => {
      setInputs((inputs) => ({ ...inputs, [fieldName]: value }));
    };
  }

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      let value = '';
      if (typeof inputs[item.key] === 'boolean') {
        value = String(inputs[item.key]);
      } else {
        value = String(inputs[item.key]);
      }
      return API.put('/api/option/', {
        key: item.key,
        value,
      });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (requestQueue.length === 1) {
          if (res.includes(undefined)) return;
        } else if (requestQueue.length > 1) {
          if (res.includes(undefined))
            return showError(t('部分保存失败，请重试'));
        }
        showSuccess(t('保存成功'));
        props.refresh();
      })
      .catch(() => {
        showError(t('保存失败，请重试'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    // 从默认值开始，用 props.options 覆盖
    const currentInputs = { ...defaultInputs };
    for (let key of Object.keys(defaultInputs)) {
      if (props.options[key] !== undefined) {
        let value = props.options[key];
        // 布尔类型字段需要转换
        if (key.endsWith('.enabled')) {
          value = value === true || value === 'true';
        }
        // 数字类型字段需要转换
        else if (key.endsWith('.min_quota') || key.endsWith('.max_quota') ||
            key.endsWith('.difficulty') || key.endsWith('.challenge_ttl')) {
          value = Number(value) || defaultInputs[key];
        }
        currentInputs[key] = value;
      }
    }
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    refForm.current.setValues(currentInputs);
  }, [props.options]);

  return (
    <>
      <Spin spinning={loading}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('签到设置')}>
            <Typography.Text
              type='tertiary'
              style={{ marginBottom: 16, display: 'block' }}
            >
              {t('签到功能允许用户每日签到获取随机额度奖励')}
            </Typography.Text>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'checkin_setting.enabled'}
                  label={t('启用签到功能')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={handleFieldChange('checkin_setting.enabled')}
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  field={'checkin_setting.min_quota'}
                  label={t('签到最小额度')}
                  placeholder={t('签到奖励的最小额度')}
                  onChange={handleFieldChange('checkin_setting.min_quota')}
                  min={0}
                  disabled={!inputs['checkin_setting.enabled']}
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  field={'checkin_setting.max_quota'}
                  label={t('签到最大额度')}
                  placeholder={t('签到奖励的最大额度')}
                  onChange={handleFieldChange('checkin_setting.max_quota')}
                  min={0}
                  disabled={!inputs['checkin_setting.enabled']}
                />
              </Col>
            </Row>
          </Form.Section>

          <Form.Section text={t('PoW 防滥用设置')}>
            <Typography.Text
              type='tertiary'
              style={{ marginBottom: 16, display: 'block' }}
            >
              {t('Proof of Work (PoW) 通过要求客户端进行计算来防止自动化滥用')}
            </Typography.Text>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6} lg={6} xl={6}>
                <Form.Switch
                  field={'pow_setting.enabled'}
                  label={t('启用 PoW 校验')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={handleFieldChange('pow_setting.enabled')}
                  disabled={!inputs['checkin_setting.enabled']}
                />
              </Col>
              <Col xs={24} sm={12} md={6} lg={6} xl={6}>
                <Form.Select
                  field={'pow_setting.mode'}
                  label={t('PoW 模式')}
                  placeholder={t('选择 PoW 模式')}
                  optionList={powModeOptions}
                  onChange={handleFieldChange('pow_setting.mode')}
                  disabled={!inputs['pow_setting.enabled'] || !inputs['checkin_setting.enabled']}
                />
              </Col>
              <Col xs={24} sm={12} md={6} lg={6} xl={6}>
                <Form.InputNumber
                  field={'pow_setting.difficulty'}
                  label={t('PoW 难度')}
                  placeholder={t('前导零 bits 数')}
                  onChange={handleFieldChange('pow_setting.difficulty')}
                  min={10}
                  max={30}
                  disabled={!inputs['pow_setting.enabled'] || !inputs['checkin_setting.enabled']}
                  extraText={t('16≈1秒, 18≈3秒, 20≈10秒, 建议16-18')}
                />
              </Col>
              <Col xs={24} sm={12} md={6} lg={6} xl={6}>
                <Form.InputNumber
                  field={'pow_setting.challenge_ttl'}
                  label={t('Challenge 有效期')}
                  onChange={handleFieldChange('pow_setting.challenge_ttl')}
                  min={5}
                  max={300}
                  disabled={!inputs['pow_setting.enabled'] || !inputs['checkin_setting.enabled']}
                  suffix={t('秒')}
                  extraText={t('Challenge 获取后的有效时间')}
                />
              </Col>
            </Row>
          </Form.Section>

          <Row>
            <Button size='default' onClick={onSubmit}>
              {t('保存签到设置')}
            </Button>
          </Row>
        </Form>
      </Spin>
    </>
  );
}
