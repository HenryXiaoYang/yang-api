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
import {
  Banner,
  Button,
  Card,
  Col,
  Form,
  Row,
  Spin,
  TagInput,
} from '@douyinfe/semi-ui';
import {
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../helpers';
import { useTranslation } from 'react-i18next';

const RankingSetting = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [groupOptions, setGroupOptions] = useState([]);
  const [inputs, setInputs] = useState({
    'ranking_setting.groups': [],
    'ranking_setting.exclude_usernames': [],
  });
  const [inputsRow, setInputsRow] = useState(inputs);
  const refForm = useRef();

  // 获取分组列表
  const fetchGroups = async () => {
    try {
      const res = await API.get('/api/group/');
      const { success, data } = res.data;
      if (success) {
        const options = data.map((group) => ({
          label: group,
          value: group,
        }));
        setGroupOptions(options);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  // 获取配置
  const getOptions = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/option/');
      const { success, message, data } = res.data;
      if (success) {
        let newInputs = { ...inputs };
        data.forEach((item) => {
          if (item.key === 'ranking_setting.groups') {
            try {
              newInputs[item.key] = JSON.parse(item.value) || [];
            } catch {
              newInputs[item.key] = [];
            }
          } else if (item.key === 'ranking_setting.exclude_usernames') {
            try {
              newInputs[item.key] = JSON.parse(item.value) || [];
            } catch {
              newInputs[item.key] = [];
            }
          }
        });
        setInputs(newInputs);
        setInputsRow(newInputs);
        if (refForm.current) {
          refForm.current.setValues(newInputs);
        }
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('获取配置失败'));
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const onSubmit = async () => {
    // 检查是否有变化
    const groupsChanged =
      JSON.stringify(inputs['ranking_setting.groups']) !==
      JSON.stringify(inputsRow['ranking_setting.groups']);
    const usernamesChanged =
      JSON.stringify(inputs['ranking_setting.exclude_usernames']) !==
      JSON.stringify(inputsRow['ranking_setting.exclude_usernames']);

    if (!groupsChanged && !usernamesChanged) {
      return showWarning(t('你似乎并没有修改什么'));
    }

    setLoading(true);
    try {
      const requests = [];
      if (groupsChanged) {
        requests.push(
          API.put('/api/option/', {
            key: 'ranking_setting.groups',
            value: JSON.stringify(inputs['ranking_setting.groups']),
          })
        );
      }
      if (usernamesChanged) {
        requests.push(
          API.put('/api/option/', {
            key: 'ranking_setting.exclude_usernames',
            value: JSON.stringify(inputs['ranking_setting.exclude_usernames']),
          })
        );
      }

      await Promise.all(requests);
      showSuccess(t('保存成功'));
      setInputsRow({ ...inputs });
    } catch (error) {
      showError(t('保存失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    getOptions();
  }, []);

  return (
    <Spin spinning={loading} size='large'>
      <Card style={{ marginTop: '10px' }}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('用户排名过滤设置')}>
            <Banner
              type='info'
              description={t(
                '配置用户排名页面显示的数据范围。可以限制只显示特定分组的数据，或排除某些用户。设置后将在约 5 分钟内生效（缓存刷新后）。'
              )}
              style={{ marginBottom: 16 }}
            />
            <Row gutter={16}>
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Select
                  field='ranking_setting.groups'
                  label={t('显示分组')}
                  extraText={t('选择要显示的分组，留空则显示全部')}
                  multiple
                  filter
                  optionList={groupOptions}
                  placeholder={t('选择分组（留空显示全部）')}
                  style={{ width: '100%' }}
                  onChange={(value) => {
                    setInputs((prev) => ({
                      ...prev,
                      'ranking_setting.groups': value || [],
                    }));
                  }}
                />
              </Col>
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Slot label={t('排除用户名')}>
                  <TagInput
                    value={inputs['ranking_setting.exclude_usernames']}
                    onChange={(value) => {
                      setInputs((prev) => ({
                        ...prev,
                        'ranking_setting.exclude_usernames': value || [],
                      }));
                    }}
                    placeholder={t('输入要排除的用户名后回车')}
                    style={{ width: '100%' }}
                  />
                  <div
                    style={{
                      color: 'var(--semi-color-text-2)',
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {t('输入要从排名中排除的用户名')}
                  </div>
                </Form.Slot>
              </Col>
            </Row>
            <Row style={{ marginTop: 16 }}>
              <Button type='primary' onClick={onSubmit}>
                {t('保存排名设置')}
              </Button>
            </Row>
          </Form.Section>
        </Form>
      </Card>
    </Spin>
  );
};

export default RankingSetting;
