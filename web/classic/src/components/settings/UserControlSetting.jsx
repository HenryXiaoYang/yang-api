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
import { Banner, Button, Card, Col, Form, Row, Spin } from '@douyinfe/semi-ui';
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

const UserControlSetting = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
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
          currentInputs[item.key] = item.value;
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
        value: inputs[item.key],
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
            <Banner
              type='info'
              description={t(
                '配置 IP 切换检测阈值，用于识别快速切换与 hopping 风险账号',
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
                  label={t('Hopping 次数阈值')}
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
                  label={t('Hopping 停留阈值')}
                  min={1}
                  step={1}
                  suffix={t('秒')}
                  extraText={t('平均停留时长低于该值判定为 IP_HOPPING')}
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
          </Form.Section>
        </Form>
      </Card>
    </Spin>
  );
};

export default UserControlSetting;
