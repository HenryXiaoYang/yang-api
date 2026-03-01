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

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Input,
  Select,
  Space,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { useTranslation } from 'react-i18next';
import CardPro from '../../components/common/ui/CardPro';
import CardTable from '../../components/common/ui/CardTable';
import {
  API,
  showError,
  showSuccess,
  createCardProPagination,
} from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';

const { Text } = Typography;

const RISK_TYPE_LABEL_MAP = {
  IP_RAPID_SWITCH: 'IP 频繁切换',
  IP_HOPPING: 'IP 跳跃异常',
};

const RISK_TAG_COLOR_MAP = {
  IP_RAPID_SWITCH: 'orange',
  IP_HOPPING: 'red',
};

const UserControl = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [riskType, setRiskType] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(true);

  const loadUsers = async (
    page = activePage,
    size = pageSize,
    search = keyword,
    currentRiskType = riskType,
  ) => {
    setLoading(true);
    try {
      let url = `/api/user/risk-control?p=${page}&page_size=${size}`;
      if (search) {
        url += `&keyword=${encodeURIComponent(search)}`;
      }
      if (currentRiskType) {
        url += `&risk_type=${encodeURIComponent(currentRiskType)}`;
      }
      const res = await API.get(url);
      const { success, data, message } = res.data;
      if (!success) {
        if ((message || '').includes('功能未启用')) {
          setFeatureEnabled(false);
          setUsers([]);
          setTotal(0);
          setSelectedRowKeys([]);
          return;
        }
        showError(message || t('加载失败'));
        return;
      }

      setFeatureEnabled(true);
      const list = (data?.items || []).map((item) => ({
        ...item,
        key: item.id,
      }));
      setUsers(list);
      setActivePage(data?.page || page);
      setTotal(data?.total || 0);
      setSelectedRowKeys([]);
    } catch (error) {
      showError(error.message || t('加载失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1, pageSize, '', '').then();
  }, []);

  const handleSearch = async () => {
    const search = keywordInput.trim();
    setKeyword(search);
    setActivePage(1);
    await loadUsers(1, pageSize, search, riskType);
  };

  const handleReset = async () => {
    setKeywordInput('');
    setKeyword('');
    setRiskType('');
    setActivePage(1);
    await loadUsers(1, pageSize, '', '');
  };

  const handleRiskTypeChange = async (value) => {
    const nextRiskType = value || '';
    setRiskType(nextRiskType);
    setActivePage(1);
    await loadUsers(1, pageSize, keyword, nextRiskType);
  };

  const handlePageChange = async (page) => {
    setActivePage(page);
    await loadUsers(page, pageSize, keyword, riskType);
  };

  const handlePageSizeChange = async (size) => {
    setPageSize(size);
    setActivePage(1);
    await loadUsers(1, size, keyword, riskType);
  };

  const manageUserStatus = async (userId, action) => {
    try {
      const res = await API.post('/api/user/manage', {
        id: userId,
        action,
      });
      const { success, message } = res.data;
      if (!success) {
        showError(message || t('操作失败'));
        return false;
      }
      return true;
    } catch (error) {
      showError(error.message || t('操作失败'));
      return false;
    }
  };

  const handleSingleControl = async (record) => {
    if (!record || record.deleted) {
      return;
    }
    const action = record.status === 1 ? 'disable' : 'enable';
    const ok = await manageUserStatus(record.id, action);
    if (ok) {
      showSuccess(action === 'disable' ? t('账号已禁用') : t('账号已启用'));
      await loadUsers(activePage, pageSize, keyword, riskType);
    }
  };

  const handleBatchDisable = async () => {
    if (selectedRowKeys.length === 0) {
      return;
    }
    const targetUsers = users.filter(
      (item) =>
        selectedRowKeys.includes(item.id) && !item.deleted && item.status === 1,
    );
    if (targetUsers.length === 0) {
      showError(t('没有可风控的账号'));
      return;
    }

    setBatchLoading(true);
    const failedUsers = [];
    for (const user of targetUsers) {
      const ok = await manageUserStatus(user.id, 'disable');
      if (!ok) {
        failedUsers.push(user.username);
      }
    }
    setBatchLoading(false);

    if (failedUsers.length > 0) {
      showError(`${t('部分账号风控失败')}: ${failedUsers.join(', ')}`);
    } else {
      showSuccess(t('批量风控完成'));
    }
    await loadUsers(activePage, pageSize, keyword, riskType);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys);
    },
    getCheckboxProps: (record) => ({
      disabled: !featureEnabled || record.deleted || record.status !== 1,
    }),
  };

  const renderStatus = (record) => {
    if (record.deleted) {
      return <Tag color='grey'>{t('已注销')}</Tag>;
    }
    if (record.status === 1) {
      return <Tag color='green'>{t('已启用')}</Tag>;
    }
    return <Tag color='red'>{t('已禁用')}</Tag>;
  };

  const columns = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 80,
      },
      {
        title: t('账号'),
        dataIndex: 'username',
        width: 200,
        render: (text, record) => (
          <div className='flex flex-col'>
            <Space spacing={4}>
              <Text strong>{text}</Text>
              {renderStatus(record)}
            </Space>
            <Text type='tertiary' size='small'>
              {record.display_name || '-'}
            </Text>
          </div>
        ),
      },
      {
        title: t('邮箱'),
        dataIndex: 'email',
        width: 200,
        render: (text) => (
          <Text type='tertiary' size='small' ellipsis={{ showTooltip: true }}>
            {text || '-'}
          </Text>
        ),
      },
      {
        title: t('分组'),
        dataIndex: 'group',
        width: 120,
        render: (text) => <Tag>{text || 'default'}</Tag>,
      },
      {
        title: t('IP 风险'),
        dataIndex: 'ip_risk_tags',
        render: (_, record) => {
          const riskTags = record.ip_risk_tags || [];
          if (!riskTags.length) {
            return <Tag color='green'>{t('未发现异常')}</Tag>;
          }
          return (
            <div className='flex flex-col gap-1'>
              <div className='flex flex-wrap gap-1'>
                {riskTags.map((riskTag) => (
                  <Tag key={riskTag} color={RISK_TAG_COLOR_MAP[riskTag] || 'red'}>
                    {t(RISK_TYPE_LABEL_MAP[riskTag] || riskTag)}
                  </Tag>
                ))}
              </div>
              <Text type='tertiary' size='small'>
                {t('快速切换')} {record.rapid_switch_count || 0} ·{' '}
                {t('真实切换')} {record.real_switch_count || 0} ·{' '}
                {t('平均停留')} {Number(record.avg_ip_duration || 0).toFixed(1)}
                s
              </Text>
            </div>
          );
        },
      },
      {
        title: t('操作'),
        dataIndex: 'operate',
        width: 120,
        render: (_, record) => (
          <Button
            type={record.status === 1 ? 'danger' : 'secondary'}
            size='small'
            disabled={!featureEnabled || record.deleted}
            onClick={() => handleSingleControl(record)}
          >
            {record.status === 1 ? t('禁用') : t('启用')}
          </Button>
        ),
      },
    ],
    [featureEnabled, t],
  );

  return (
    <div className='mt-[60px] px-2'>
      <CardPro
        type='type1'
        descriptionArea={
          <div className='flex flex-col gap-1'>
            <Text strong>{t('用户风控')}</Text>
            <Text type='tertiary' size='small'>
              {t('基于 IP 切换行为识别高风险账号并进行批量风控')}
            </Text>
            {!featureEnabled && (
              <Text type='danger' size='small'>
                {t('功能未启用，请在设置中开启')}
              </Text>
            )}
          </div>
        }
        actionsArea={
          <div className='flex flex-col md:flex-row w-full gap-2 justify-between'>
            <Space wrap>
              <Input
                showClear
                value={keywordInput}
                onChange={setKeywordInput}
                onEnterPress={handleSearch}
                placeholder={t('搜索用户名 / 邮箱 / ID')}
                style={{ width: isMobile ? 220 : 280 }}
                disabled={!featureEnabled}
              />
              <Select
                value={riskType}
                onChange={handleRiskTypeChange}
                style={{ width: isMobile ? 180 : 220 }}
                disabled={!featureEnabled}
              >
                <Select.Option value=''>{t('全部风险类型')}</Select.Option>
                <Select.Option value='IP_RAPID_SWITCH'>
                  {t(RISK_TYPE_LABEL_MAP.IP_RAPID_SWITCH)}
                </Select.Option>
                <Select.Option value='IP_HOPPING'>
                  {t(RISK_TYPE_LABEL_MAP.IP_HOPPING)}
                </Select.Option>
              </Select>
              <Button
                onClick={handleSearch}
                type='primary'
                disabled={!featureEnabled}
              >
                {t('搜索')}
              </Button>
              <Button onClick={handleReset} disabled={!featureEnabled}>
                {t('重置')}
              </Button>
            </Space>
            <Button
              type='danger'
              loading={batchLoading}
              disabled={!featureEnabled || selectedRowKeys.length === 0}
              onClick={handleBatchDisable}
            >
              {t('批量禁用账号')} ({selectedRowKeys.length})
            </Button>
          </div>
        }
        paginationArea={createCardProPagination({
          currentPage: activePage,
          pageSize,
          total,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
          isMobile,
          t,
        })}
        t={t}
      >
        <CardTable
          columns={columns}
          dataSource={users}
          rowSelection={rowSelection}
          hidePagination={true}
          loading={loading}
          onRow={(record) => {
            if ((record.ip_risk_tags || []).length > 0) {
              return {
                style: {
                  background: 'rgba(255, 165, 0, 0.08)',
                },
              };
            }
            return {};
          }}
          empty={
            <Empty
              image={
                <IllustrationNoResult style={{ width: 150, height: 150 }} />
              }
              darkModeImage={
                <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
              }
              description={
                featureEnabled ? t('暂无数据') : t('功能未启用，请在设置中开启')
              }
              style={{ padding: 30 }}
            />
          }
          className='overflow-hidden'
          size='middle'
          rowKey='id'
          scroll={{ x: 'max-content' }}
        />
      </CardPro>
    </div>
  );
};

export default UserControl;
