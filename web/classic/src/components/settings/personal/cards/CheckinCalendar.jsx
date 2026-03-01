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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  Calendar,
  Button,
  Typography,
  Avatar,
  Spin,
  Tooltip,
  Collapsible,
  Modal,
  Progress,
} from '@douyinfe/semi-ui';
import {
  CalendarCheck,
  Gift,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
} from 'lucide-react';
import Turnstile from 'react-turnstile';
import { API, showError, showSuccess, renderQuota } from '../../../../helpers';
import { usePow } from '../../../../hooks/common/usePow';

const CheckinCalendar = ({ t, status, turnstileEnabled, turnstileSiteKey }) => {
  const [loading, setLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [turnstileModalVisible, setTurnstileModalVisible] = useState(false);
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0);
  const [checkinData, setCheckinData] = useState({
    enabled: false,
    stats: {
      checked_in_today: false,
      total_checkins: 0,
      total_quota: 0,
      checkin_count: 0,
      records: [],
    },
  });
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  // 初始加载状态，用于避免折叠状态闪烁
  const [initialLoaded, setInitialLoaded] = useState(false);
  // 折叠状态：null 表示未确定（等待首次加载）
  const [isCollapsed, setIsCollapsed] = useState(null);

  // PoW hook
  const { solveChallenge, solving: powSolving, progress: powProgress } = usePow();

  // 保存 PoW solution 以便在 Turnstile 验证后复用
  const powSolutionRef = useRef(null);

  // 创建日期到额度的映射，方便快速查找
  const checkinRecordsMap = useMemo(() => {
    const map = {};
    const records = checkinData.stats?.records || [];
    records.forEach((record) => {
      map[record.checkin_date] = record.quota_awarded;
    });
    return map;
  }, [checkinData.stats?.records]);

  // 计算本月获得的额度
  const monthlyQuota = useMemo(() => {
    const records = checkinData.stats?.records || [];
    return records.reduce(
      (sum, record) => sum + (record.quota_awarded || 0),
      0,
    );
  }, [checkinData.stats?.records]);

  // 获取签到状态
  const fetchCheckinStatus = async (month) => {
    const isFirstLoad = !initialLoaded;
    setLoading(true);
    try {
      const res = await API.get(`/api/user/checkin?month=${month}`);
      const { success, data, message } = res.data;
      if (success) {
        setCheckinData(data);
        // 首次加载时，根据签到状态设置折叠状态
        if (isFirstLoad) {
          setIsCollapsed(data.stats?.checked_in_today ?? false);
          setInitialLoaded(true);
        }
      } else {
        showError(message || t('获取签到状态失败'));
        if (isFirstLoad) {
          setIsCollapsed(false);
          setInitialLoaded(true);
        }
      }
    } catch (error) {
      showError(t('获取签到状态失败'));
      if (isFirstLoad) {
        setIsCollapsed(false);
        setInitialLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // 判断是否需要 PoW
  const shouldRequirePow = () => {
    if (!status?.pow_enabled) return false;
    const mode = status?.pow_mode || 'replace';
    switch (mode) {
      case 'replace':
        return true;
      case 'supplement':
        return true;
      case 'fallback':
        return !turnstileEnabled;
      default:
        return true;
    }
  };

  // 判断是否需要 Turnstile
  const shouldRequireTurnstile = () => {
    if (!turnstileEnabled) return false;
    const mode = status?.pow_mode || 'replace';
    // replace 模式下 PoW 完全替代 Turnstile
    if (status?.pow_enabled && mode === 'replace') {
      return false;
    }
    return true;
  };

  // 构建签到 URL
  const buildCheckinUrl = (turnstileToken, powSolution) => {
    const params = new URLSearchParams();
    if (turnstileToken) {
      params.set('turnstile', turnstileToken);
    }
    if (powSolution) {
      params.set('pow_challenge', powSolution.challenge_id);
      params.set('pow_nonce', powSolution.nonce);
    }
    const queryString = params.toString();
    return queryString ? `/api/user/checkin?${queryString}` : '/api/user/checkin';
  };

  const postCheckin = async (turnstileToken, powSolution) => {
    const url = buildCheckinUrl(turnstileToken, powSolution);
    return API.post(url);
  };

  const shouldTriggerTurnstile = (message) => {
    if (!turnstileEnabled) return false;
    if (typeof message !== 'string') return true;
    return message.includes('Turnstile');
  };

  const shouldTriggerPow = (message) => {
    if (!status?.pow_enabled) return false;
    if (typeof message !== 'string') return true;
    return message.includes('PoW') || message.includes('pow');
  };

  // 处理 Turnstile 验证完成
  const handleTurnstileVerify = (token) => {
    // 使用保存的 PoW solution
    doCheckin(token, powSolutionRef.current);
  };

  const doCheckin = async (turnstileToken = null, powSolution = null) => {
    setCheckinLoading(true);
    try {
      // 如果需要 PoW 且还没有解决方案，先计算 PoW
      if (shouldRequirePow() && !powSolution) {
        const solution = await solveChallenge('checkin');
        if (!solution) {
          showError(t('PoW 计算失败，请重试'));
          setCheckinLoading(false);
          return;
        }
        powSolution = solution;
        // 保存 PoW solution 以便后续 Turnstile 验证后复用
        powSolutionRef.current = solution;
      }

      const res = await postCheckin(turnstileToken, powSolution);
      const { success, data, message } = res.data;
      if (success) {
        showSuccess(
          t('签到成功！获得') + ' ' + renderQuota(data.quota_awarded),
        );
        // 清除保存的 PoW solution
        powSolutionRef.current = null;
        // 刷新签到状态
        fetchCheckinStatus(currentMonth);
        setTurnstileModalVisible(false);
      } else {
        // 检查是否需要 Turnstile
        if (!turnstileToken && shouldTriggerTurnstile(message)) {
          if (!turnstileSiteKey) {
            showError('Turnstile is enabled but site key is empty.');
            return;
          }
          // 需要 Turnstile，PoW solution 已保存在 ref 中
          setTurnstileModalVisible(true);
          setCheckinLoading(false);
          return;
        }
        if (turnstileToken && shouldTriggerTurnstile(message)) {
          setTurnstileWidgetKey((v) => v + 1);
        }
        // 检查是否需要 PoW
        if (shouldTriggerPow(message)) {
          // 清除失败的 PoW solution
          powSolutionRef.current = null;
          showError(message || t('PoW 验证失败，请重试'));
          return;
        }
        showError(message || t('签到失败'));
      }
    } catch (error) {
      showError(t('签到失败'));
    } finally {
      setCheckinLoading(false);
    }
  };

  useEffect(() => {
    if (status?.checkin_enabled) {
      fetchCheckinStatus(currentMonth);
    }
  }, [status?.checkin_enabled, currentMonth]);

  // 如果签到功能未启用，不显示组件
  if (!status?.checkin_enabled) {
    return null;
  }

  // 日期渲染函数 - 显示签到状态和获得的额度
  const dateRender = (dateString) => {
    // Semi Calendar 传入的 dateString 是 Date.toString() 格式
    // 需要转换为 YYYY-MM-DD 格式来匹配后端数据
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    // 使用本地时间格式化，避免时区问题
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`; // YYYY-MM-DD
    const quotaAwarded = checkinRecordsMap[formattedDate];
    const isCheckedIn = quotaAwarded !== undefined;

    if (isCheckedIn) {
      return (
        <Tooltip
          content={`${t('获得')} ${renderQuota(quotaAwarded)}`}
          position='top'
        >
          <div className='absolute inset-0 flex flex-col items-center justify-center cursor-pointer'>
            <div className='w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mb-0.5 shadow-sm'>
              <Check size={14} className='text-white' strokeWidth={3} />
            </div>
            <div className='text-[10px] font-medium text-green-600 dark:text-green-400 leading-none'>
              {renderQuota(quotaAwarded)}
            </div>
          </div>
        </Tooltip>
      );
    }
    return null;
  };

  // 处理月份变化
  const handleMonthChange = (date) => {
    const month = date.toISOString().slice(0, 7);
    setCurrentMonth(month);
  };

  // 计算按钮文本
  const getButtonText = () => {
    if (!initialLoaded) return t('加载中...');
    if (checkinData.stats?.checked_in_today) return t('今日已签到');
    if (powSolving) {
      const attempts = powProgress?.attempts || 0;
      return t('计算中...') + (attempts > 0 ? ` (${Math.floor(attempts / 1000)}K)` : '');
    }
    return t('立即签到');
  };

  // 判断按钮是否正在加载
  const isButtonLoading = checkinLoading || !initialLoaded || powSolving;

  return (
    <Card className='!rounded-2xl'>
      <Modal
        title='Security Check'
        visible={turnstileModalVisible}
        footer={null}
        centered
        onCancel={() => {
          setTurnstileModalVisible(false);
          setTurnstileWidgetKey((v) => v + 1);
          // 清除保存的 PoW solution
          powSolutionRef.current = null;
        }}
      >
        <div className='flex justify-center py-2'>
          <Turnstile
            key={turnstileWidgetKey}
            sitekey={turnstileSiteKey}
            onVerify={handleTurnstileVerify}
            onExpire={() => {
              setTurnstileWidgetKey((v) => v + 1);
            }}
          />
        </div>
      </Modal>

      {/* 卡片头部 */}
      <div className='flex items-center justify-between'>
        <div
          className='flex items-center flex-1 cursor-pointer'
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Avatar size='small' color='green' className='mr-3 shadow-md'>
            <CalendarCheck size={16} />
          </Avatar>
          <div className='flex-1'>
            <div className='flex items-center gap-2'>
              <Typography.Text className='text-lg font-medium'>
                {t('每日签到')}
              </Typography.Text>
              {isCollapsed ? (
                <ChevronDown size={16} className='text-gray-400' />
              ) : (
                <ChevronUp size={16} className='text-gray-400' />
              )}
            </div>
            <div className='text-xs text-gray-500 dark:text-gray-400'>
              {!initialLoaded
                ? t('正在加载签到状态...')
                : powSolving
                  ? t('正在进行安全验证...')
                  : checkinData.stats?.checked_in_today
                    ? t('今日已签到，累计签到') +
                      ` ${checkinData.stats?.total_checkins || 0} ` +
                      t('天')
                    : t('每日签到可获得随机额度奖励')}
            </div>
          </div>
        </div>
        <Button
          type='primary'
          theme='solid'
          icon={powSolving ? <Cpu size={16} className="animate-pulse" /> : <Gift size={16} />}
          onClick={() => doCheckin()}
          loading={isButtonLoading}
          disabled={!initialLoaded || checkinData.stats?.checked_in_today}
          className='!bg-green-600 hover:!bg-green-700'
        >
          {getButtonText()}
        </Button>
      </div>

      {/* PoW 计算进度条 */}
      {powSolving && powProgress && (
        <div className='mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
          <div className='flex items-center gap-2 mb-1'>
            <Cpu size={14} className='text-blue-500 animate-spin' />
            <Typography.Text className='text-xs text-blue-600 dark:text-blue-400'>
              {t('正在计算安全验证...')}
            </Typography.Text>
          </div>
          <Progress
            percent={Math.min((powProgress.attempts / 500000) * 100, 95)}
            showInfo={false}
            size='small'
            stroke='var(--semi-color-primary)'
          />
          <Typography.Text className='text-xs text-gray-500 mt-1'>
            {t('已尝试')} {Math.floor(powProgress.attempts / 1000)}K {t('次计算')}
          </Typography.Text>
        </div>
      )}

      {/* 可折叠内容 */}
      <Collapsible isOpen={isCollapsed === false} keepDOM>
        {/* 签到统计 */}
        <div className='grid grid-cols-3 gap-3 mb-4 mt-4'>
          <div className='text-center p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg'>
            <div className='text-xl font-bold text-green-600'>
              {checkinData.stats?.total_checkins || 0}
            </div>
            <div className='text-xs text-gray-500'>{t('累计签到')}</div>
          </div>
          <div className='text-center p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg'>
            <div className='text-xl font-bold text-orange-600'>
              {renderQuota(monthlyQuota, 6)}
            </div>
            <div className='text-xs text-gray-500'>{t('本月获得')}</div>
          </div>
          <div className='text-center p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg'>
            <div className='text-xl font-bold text-blue-600'>
              {renderQuota(checkinData.stats?.total_quota || 0, 6)}
            </div>
            <div className='text-xs text-gray-500'>{t('累计获得')}</div>
          </div>
        </div>

        {/* 签到日历 - 使用更紧凑的样式 */}
        <Spin spinning={loading}>
          <div className='border rounded-lg overflow-hidden checkin-calendar'>
            <style>{`
            .checkin-calendar .semi-calendar {
              font-size: 13px;
            }
            .checkin-calendar .semi-calendar-month-header {
              padding: 8px 12px;
            }
            .checkin-calendar .semi-calendar-month-week-row {
              height: 28px;
            }
            .checkin-calendar .semi-calendar-month-week-row th {
              font-size: 12px;
              padding: 4px 0;
            }
            .checkin-calendar .semi-calendar-month-grid-row {
              height: auto;
            }
            .checkin-calendar .semi-calendar-month-grid-row td {
              height: 56px;
              padding: 2px;
            }
            .checkin-calendar .semi-calendar-month-grid-row-cell {
              position: relative;
              height: 100%;
            }
            .checkin-calendar .semi-calendar-month-grid-row-cell-day {
              position: absolute;
              top: 4px;
              left: 50%;
              transform: translateX(-50%);
              font-size: 12px;
              z-index: 1;
            }
            .checkin-calendar .semi-calendar-month-same {
              background: transparent;
            }
            .checkin-calendar .semi-calendar-month-today .semi-calendar-month-grid-row-cell-day {
              background: var(--semi-color-primary);
              color: white;border-radius: 50%;
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;}
          `}</style>
            <Calendar
              mode='month'
              onChange={handleMonthChange}
              dateGridRender={(dateString, date) => dateRender(dateString)}
            />
          </div>
        </Spin>

        {/* 签到说明 */}
        <div className='mt-3 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg'>
          <Typography.Text type='tertiary' className='text-xs'>
            <ul className='list-disc list-inside space-y-0.5'>
              <li>{t('每日签到可获得随机额度奖励')}</li>
              <li>{t('签到奖励将直接添加到您的账户余额')}</li>
              <li>{t('每日仅可签到一次，请勿重复签到')}</li>
            </ul>
          </Typography.Text>
        </div>
      </Collapsible>
    </Card>
  );
};

export default CheckinCalendar;
