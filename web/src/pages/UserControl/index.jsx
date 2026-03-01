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
  Popover,
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
  timestamp2string,
  createCardProPagination,
} from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';

const { Text } = Typography;

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
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const loadUsers = async (page = activePage, size = pageSize, search = keyword) => {
    setLoading(true);
    try {
      let url = `/api/user/tls-control?p=${page}&page_size=${size}`;
      if (search) {
        url += `&keyword=${encodeURIComponent(search)}`;
      }
      const res = await API.get(url);
      const { success, data, message } = res.data;
      if (!success) {
        showError(message || t('加载失败'));
        return;
      }

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
    loadUsers(1, pageSize, '').then();
  }, []);

  const handleSearch = async () => {
    const search = keywordInput.trim();
    setKeyword(search);
    setActivePage(1);
    await loadUsers(1, pageSize, search);
  };

  const handleReset = async () => {
    setKeywordInput('');
    setKeyword('');
    setActivePage(1);
    await loadUsers(1, pageSize, '');
  };

  const handlePageChange = async (page) => {
    setActivePage(page);
    await loadUsers(page, pageSize, keyword);
  };

  const handlePageSizeChange = async (size) => {
    setPageSize(size);
    setActivePage(1);
    await loadUsers(1, size, keyword);
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
      await loadUsers(activePage, pageSize, keyword);
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
      showError(t('没有可封控的账号'));
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
      showError(`${t('部分账号封控失败')}: ${failedUsers.join(', ')}`);
    } else {
      showSuccess(t('批量封控完成'));
    }
    await loadUsers(activePage, pageSize, keyword);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys);
    },
    getCheckboxProps: (record) => ({
      disabled: record.deleted || record.status !== 1,
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
        title: t('TLS 指纹'),
        dataIndex: 'latest_fingerprint',
        render: (text, record) => {
          if (!text) {
            return <Tag color='white'>{t('暂无')}</Tag>;
          }
          const shortened = text.length > 28 ? `${text.slice(0, 28)}...` : text;
          return (
            <div className='flex flex-col gap-1'>
              <Tag color={record.suspected_alt ? 'red' : 'blue'}>{shortened}</Tag>
              <Text type='tertiary' size='small'>
                {record.latest_seen ? timestamp2string(record.latest_seen) : '-'}
              </Text>
            </div>
          );
        },
      },
      {
        title: t('疑似关系'),
        dataIndex: 'related_users',
        render: (_, record) => {
          if (!record.suspected_alt) {
            return <Tag color='green'>{t('未发现共享')}</Tag>;
          }
          const content = (
            <div className='flex flex-col gap-1 max-w-[260px]'>
              {(record.related_users || []).map((user) => (
                <Tag
                  key={user.id}
                  color={user.status === 1 ? 'blue' : 'red'}
                  className='!mr-0'
                >
                  #{user.id} {user.username}
                </Tag>
              ))}
            </div>
          );
          return (
            <Popover content={content} position='leftTop'>
              <Tag color='red'>
                {t('疑似小号')} ({record.related_users?.length || 0})
              </Tag>
            </Popover>
          );
        },
      },
      {
        title: t('指纹明细'),
        dataIndex: 'fingerprints',
        render: (fingerprints = []) => {
          if (!fingerprints.length) {
            return <Text type='tertiary'>{t('暂无')}</Text>;
          }
          return (
            <div className='flex flex-wrap gap-1'>
              {fingerprints.slice(0, 3).map((fp) => (
                <Tag
                  key={fp.fingerprint}
                  color={fp.shared_user_count > 0 ? 'red' : 'white'}
                >
                  {fp.source || 'tls'} · {t('请求')} {fp.request_count}
                </Tag>
              ))}
              {fingerprints.length > 3 && (
                <Tag color='blue'>+{fingerprints.length - 3}</Tag>
              )}
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
            disabled={record.deleted}
            onClick={() => handleSingleControl(record)}
          >
            {record.status === 1 ? t('禁用') : t('启用')}
          </Button>
        ),
      },
    ],
    [t, users],
  );

  return (
    <div className='mt-[60px] px-2'>
      <CardPro
        type='type1'
        descriptionArea={
          <div className='flex flex-col gap-1'>
            <Text strong>{t('用户封控')}</Text>
            <Text type='tertiary' size='small'>
              {t('基于 TLS 指纹识别疑似共享账号并进行批量封控')}
            </Text>
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
              />
              <Button onClick={handleSearch} type='primary'>
                {t('搜索')}
              </Button>
              <Button onClick={handleReset}>{t('重置')}</Button>
            </Space>
            <Button
              type='danger'
              loading={batchLoading}
              disabled={selectedRowKeys.length === 0}
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
            if (record.suspected_alt) {
              return {
                style: {
                  background: 'rgba(255, 99, 71, 0.08)',
                },
              };
            }
            return {};
          }}
          empty={
            <Empty
              image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
              darkModeImage={
                <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
              }
              description={t('暂无数据')}
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
