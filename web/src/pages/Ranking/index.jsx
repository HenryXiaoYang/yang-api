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

import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Spin, Avatar } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { API, showError } from '../../helpers';
import { Trophy, Users, Globe, Coins } from 'lucide-react';

const medalColors = {
  gold: { border: '#FFD700', shadow: '0 0 12px #FFD700', text: '#B8860B' },
  silver: { border: '#C0C0C0', shadow: '0 0 12px #C0C0C0', text: '#808080' },
  bronze: { border: '#CD7F32', shadow: '0 0 12px #CD7F32', text: '#8B4513' },
};

const getMedalStyle = (index) => {
  if (index === 0) return medalColors.gold;
  if (index === 1) return medalColors.silver;
  if (index === 2) return medalColors.bronze;
  return null;
};

const RankAvatar = ({ name, index }) => {
  const medal = getMedalStyle(index);
  const letter = (name || '?')[0].toUpperCase();

  return (
    <Avatar
      size="small"
      style={medal ? {
        border: `2px solid ${medal.border}`,
        boxShadow: medal.shadow,
      } : {}}
    >
      {letter}
    </Avatar>
  );
};

const Ranking = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [userCallRanking, setUserCallRanking] = useState([]);
  const [ipCallRanking, setIpCallRanking] = useState([]);
  const [userTokenRanking, setUserTokenRanking] = useState([]);

  const loadRankingData = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/log/ranking');
      if (res.data.success) {
        setUserCallRanking(res.data.data.user_call_ranking || []);
        setIpCallRanking(res.data.data.ip_call_ranking || []);
        setUserTokenRanking(res.data.data.user_token_ranking || []);
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(t('加载失败'));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRankingData();
  }, []);

  const renderRank = (_, __, index) => {
    const medal = getMedalStyle(index);
    return (
      <span style={medal ? { fontWeight: 'bold', color: medal.text } : {}}>
        {index + 1}
      </span>
    );
  };

  const renderUserWithAvatar = (_, record, index) => {
    const medal = getMedalStyle(index);
    const displayName = record.display_name || record.username;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <RankAvatar name={displayName} index={index} />
        <span style={medal ? { fontWeight: 'bold', color: medal.text } : {}}>
          {displayName}
        </span>
      </div>
    );
  };

  const userCallColumns = [
    { title: t('排名'), dataIndex: 'rank', width: 60, render: renderRank },
    { title: t('用户名'), dataIndex: 'username', render: renderUserWithAvatar },
    { title: t('调用次数'), dataIndex: 'count', align: 'right' },
  ];

  const renderIPUsers = (_, record) => {
    const names = record.display_name || record.username || '';
    return names.split(',').filter(n => n).join(', ') || '-';
  };

  const ipCallColumns = [
    { title: t('排名'), dataIndex: 'rank', width: 60, render: renderRank },
    { title: 'IP', dataIndex: 'ip' },
    { title: t('用户'), dataIndex: 'username', render: renderIPUsers },
    { title: t('调用次数'), dataIndex: 'count', align: 'right' },
  ];

  const userTokenColumns = [
    { title: t('排名'), dataIndex: 'rank', width: 60, render: renderRank },
    { title: t('用户名'), dataIndex: 'username', render: renderUserWithAvatar },
    { title: 'Tokens', dataIndex: 'tokens', align: 'right', render: (tokens) => tokens?.toLocaleString() },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <div className='mb-4'>
        <div className='flex items-center gap-2 mb-2'>
          <Trophy size={24} className='text-yellow-500' />
          <Typography.Title heading={4} className='!mb-0'>
            {t('用户排名')}
          </Typography.Title>
        </div>
        <Typography.Text type='tertiary'>
          {t('今日用户调用统计排名')}
        </Typography.Text>
      </div>

      <Spin spinning={loading}>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
          <Card
            className='table-scroll-card'
            title={
              <div className='flex items-center gap-2'>
                <Users size={18} />
                {t('用户调用次数排名')}
              </div>
            }
          >
            <Table
              columns={userCallColumns}
              dataSource={userCallRanking}
              pagination={false}
              size='small'
              empty={t('暂无数据')}
              rowKey='username'
            />
          </Card>

          <Card
            className='table-scroll-card'
            title={
              <div className='flex items-center gap-2'>
                <Globe size={18} />
                {t('IP调用次数排名')}
              </div>
            }
          >
            <Table
              columns={ipCallColumns}
              dataSource={ipCallRanking}
              pagination={false}
              size='small'
              empty={t('暂无数据')}
              rowKey='ip'
            />
          </Card>

          <Card
            className='table-scroll-card'
            title={
              <div className='flex items-center gap-2'>
                <Coins size={18} />
                {t('用户Token消耗排名')}
              </div>
            }
          >
            <Table
              columns={userTokenColumns}
              dataSource={userTokenRanking}
              pagination={false}
              size='small'
              empty={t('暂无数据')}
              rowKey='username'
            />
          </Card>
        </div>
      </Spin>
    </div>
  );
};

export default Ranking;
