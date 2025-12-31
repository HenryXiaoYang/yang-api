import React, { useContext, useEffect, useState } from 'react';
import { Card, Typography, Input, Button, Tabs, TabPane, Progress } from '@douyinfe/semi-ui';
import { IconCopy } from '@douyinfe/semi-icons';
import { API, copy, showSuccess } from '../../helpers';
import { StatusContext } from '../../context/Status';
import { useTranslation } from 'react-i18next';

const { Text, Title } = Typography;

const YangApiHome = () => {
  const { t } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const [stats, setStats] = useState({ rpm: 0, default_ratio: 1, is_dynamic: false });

  const serverAddress = statusState?.status?.server_address || window.location.origin;
  const systemName = statusState?.status?.system_name || 'Yang API';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get('/api/system/stats');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (e) {
        console.error('Failed to fetch system stats', e);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = async (text) => {
    if (await copy(text)) {
      showSuccess(t('已复制到剪切板'));
    }
  };

  const configJson = `{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "${t('你的密钥')}",
    "ANTHROPIC_BASE_URL": "${serverAddress}",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  }
}`;

  const configTabs = [
    { key: 'all', label: t('通用'), path: '~/.claude/settings.json' },
    { key: 'windows', label: 'Windows', path: '%USERPROFILE%\\.claude\\settings.json' },
    { key: 'macos', label: 'macOS', path: '~/.claude/settings.json' },
    { key: 'linux', label: 'Linux', path: '~/.claude/settings.json' },
  ];

  // RPM 可视化：假设最大 1000 RPM
  const rpmPercent = Math.min((stats.rpm / 1000) * 100, 100);
  const rpmColor = stats.rpm < 50 ? 'var(--semi-color-success)' : stats.rpm < 100 ? 'var(--semi-color-warning)' : 'var(--semi-color-danger)';

  return (
    <div className="w-full min-h-screen bg-semi-color-bg-0">
      {/* Hero Section */}
      <div className="w-full py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* 站点名称 */}
          <div className="text-center mb-8">
            <Title heading={1} className="!text-4xl md:!text-5xl font-bold">{systemName}</Title>
          </div>

          {/* API Base URL - 标题和输入框同行 */}
          <div className="flex items-center justify-center gap-4 mb-10 flex-wrap">
            <Text className="!text-lg font-medium whitespace-nowrap">API Base URL</Text>
            <Input
              readonly
              value={serverAddress}
              size="large"
              className="!w-80 md:!w-96"
              suffix={
                <Button
                  theme="borderless"
                  icon={<IconCopy />}
                  onClick={() => handleCopy(serverAddress)}
                />
              }
            />
          </div>

          {/* 数据可视化卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* RPM 卡片 */}
            <Card className="!rounded-xl" bodyStyle={{ padding: '24px' }}>
              <div className="text-center">
                <Text type="tertiary" className="!text-sm">{t('当前 总RPM')}</Text>
                <div className="my-4">
                  <span className="text-5xl font-bold" style={{ color: rpmColor }}>{stats.rpm}</span>
                  <span className="text-xl text-semi-color-text-2 ml-1">req/min</span>
                </div>
                <Progress
                  percent={rpmPercent}
                  showInfo={false}
                  stroke={rpmColor}
                  style={{ height: 8 }}
                />
              </div>
            </Card>

            {/* 倍率卡片 */}
            <Card className="!rounded-xl" bodyStyle={{ padding: '24px' }}>
              <div className="text-center">
                <Text type="tertiary" className="!text-sm">{t('默认倍率')}</Text>
                <div className="my-4">
                  <span className="text-5xl font-bold text-semi-color-primary">x{stats.default_ratio}</span>
                  {stats.is_dynamic && (
                    <span className="ml-2 px-2 py-1 bg-semi-color-warning-light-default text-semi-color-warning rounded text-sm">
                      {t('动态')}
                    </span>
                  )}
                </div>
                <Progress
                  percent={Math.min(stats.default_ratio * 50, 100)}
                  showInfo={false}
                  stroke="var(--semi-color-primary)"
                  style={{ height: 8 }}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Claude Code Config Section */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <Card title={t('Claude Code 配置')} className="!rounded-xl">
          <Tabs>
            {configTabs.map((tab) => (
              <TabPane key={tab.key} tab={tab.label} itemKey={tab.key}>
                <div className="mb-4">
                  <Text type="secondary">{t('配置文件路径')}:</Text>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="bg-semi-color-fill-0 px-3 py-2 rounded text-sm flex-1 overflow-x-auto">
                      {tab.path}
                    </code>
                    <Button
                      size="small"
                      icon={<IconCopy />}
                      onClick={() => handleCopy(tab.path)}
                    />
                  </div>
                </div>
              </TabPane>
            ))}
          </Tabs>
          <div className="mt-4">
            <Text type="secondary">{t('添加以下配置')}:</Text>
            <div className="relative mt-2">
              <pre className="bg-semi-color-fill-0 p-4 rounded-lg overflow-x-auto text-sm">
                {configJson}
              </pre>
              <Button
                size="small"
                icon={<IconCopy />}
                className="absolute top-3 right-3"
                onClick={() => handleCopy(configJson)}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default YangApiHome;
