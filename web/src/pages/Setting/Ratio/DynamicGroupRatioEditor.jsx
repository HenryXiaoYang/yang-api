import React, { useState, useEffect, useCallback } from 'react';
import {
  RadioGroup,
  Radio,
  InputNumber,
  Select,
  Button,
  Table,
  Space,
  Typography,
} from '@douyinfe/semi-ui';
import { IconPlus, IconDelete } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

export default function DynamicGroupRatioEditor({
  value,
  onChange,
  availableGroups = [],
}) {
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    enabled: true,
    mode: 'time',
    rpm_window_minutes: 1,
    timezone: 'Asia/Shanghai',
    group_configs: {},
  });
  const [selectedGroup, setSelectedGroup] = useState('');

  // Parse JSON value to config
  useEffect(() => {
    if (value) {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        const newConfig = {
          enabled: parsed.enabled !== false,
          mode: parsed.mode || 'time',
          rpm_window_minutes: parsed.rpm_window_minutes || 1,
          timezone: parsed.timezone || 'Asia/Shanghai',
          group_configs: parsed.group_configs || {},
        };
        setConfig(newConfig);
        const groups = Object.keys(newConfig.group_configs);
        if (groups.length > 0 && !selectedGroup) {
          setSelectedGroup(groups[0]);
        }
      } catch (e) {
        console.error('Failed to parse DynamicGroupRatioSetting:', e);
      }
    }
  }, [value]);

  // Sync config changes to parent
  const updateConfig = useCallback(
    (newConfig) => {
      setConfig(newConfig);
      onChange(JSON.stringify(newConfig, null, 2));
    },
    [onChange],
  );

  const handleModeChange = (e) => {
    updateConfig({ ...config, mode: e.target.value });
  };

  const handleRpmWindowChange = (val) => {
    updateConfig({ ...config, rpm_window_minutes: val || 1 });
  };

  const handleTimezoneChange = (val) => {
    updateConfig({ ...config, timezone: val });
  };

  const addGroupConfig = (groupName) => {
    if (!groupName || config.group_configs[groupName]) return;
    const newConfigs = {
      ...config.group_configs,
      [groupName]: { time_ranges: [], rpm_ranges: [] },
    };
    updateConfig({ ...config, group_configs: newConfigs });
    setSelectedGroup(groupName);
  };

  const deleteGroupConfig = (groupName) => {
    const newConfigs = { ...config.group_configs };
    delete newConfigs[groupName];
    updateConfig({ ...config, group_configs: newConfigs });
    const groups = Object.keys(newConfigs);
    setSelectedGroup(groups.length > 0 ? groups[0] : '');
  };

  const updateGroupConfig = (groupName, field, newValue) => {
    const newConfigs = {
      ...config.group_configs,
      [groupName]: {
        ...config.group_configs[groupName],
        [field]: newValue,
      },
    };
    updateConfig({ ...config, group_configs: newConfigs });
  };

  // Configured groups
  const configuredGroups = Object.keys(config.group_configs);

  // Groups that can be added (from availableGroups but not yet configured)
  const addableGroups = (availableGroups || []).filter(
    (g) => !configuredGroups.includes(g),
  );

  const groupOptions = configuredGroups.map((g) => ({
    value: g,
    label: g,
  }));

  const addableGroupOptions = addableGroups.map((g) => ({
    value: g,
    label: g,
  }));

  const currentGroupConfig = config.group_configs[selectedGroup] || {
    time_ranges: [],
    rpm_ranges: [],
  };

  return (
    <Space vertical align='start' style={{ width: '100%' }} spacing='medium'>
      {/* Mode Selection */}
      <div>
        <Text strong style={{ marginBottom: 8, display: 'block' }}>
          {t('动态倍率模式')}
        </Text>
        <RadioGroup
          type='button'
          value={config.mode}
          onChange={handleModeChange}
        >
          <Radio value='time'>{t('按时间段')}</Radio>
          <Radio value='rpm'>{t('按用户RPM')}</Radio>
        </RadioGroup>
      </div>

      {/* Timezone (only for time mode) */}
      {config.mode === 'time' && (
        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            {t('时区')}
          </Text>
          <Select
            value={config.timezone}
            onChange={handleTimezoneChange}
            style={{ width: 200 }}
            optionList={[
              { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)' },
              { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
              { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)' },
              { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
              { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1)' },
              { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
              { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8)' },
              { value: 'UTC', label: 'UTC' },
            ]}
          />
        </div>
      )}

      {/* RPM Window (only for rpm mode) */}
      {config.mode === 'rpm' && (
        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            {t('RPM时间窗口')}
          </Text>
          <Space>
            <InputNumber
              value={config.rpm_window_minutes}
              onChange={handleRpmWindowChange}
              min={1}
              max={60}
              style={{ width: 120 }}
            />
            <Text type='tertiary'>{t('分钟')}</Text>
          </Space>
        </div>
      )}

      {/* Group Configuration */}
      <div style={{ width: '100%' }}>
        <Text strong style={{ marginBottom: 8, display: 'block' }}>
          {t('分组配置')}
        </Text>
        <Space style={{ marginBottom: 12 }}>
          <Select
            placeholder={t('添加分组')}
            style={{ width: 150 }}
            optionList={addableGroupOptions}
            onChange={(val) => {
              addGroupConfig(val);
            }}
            value={undefined}
            emptyContent={t('无可添加分组')}
          />
          <Select
            value={selectedGroup}
            onChange={setSelectedGroup}
            optionList={groupOptions}
            placeholder={t('选择已配置分组')}
            style={{ width: 150 }}
            emptyContent={t('暂无配置')}
          />
          {selectedGroup && (
            <Button
              icon={<IconDelete />}
              type='danger'
              onClick={() => deleteGroupConfig(selectedGroup)}
            >
              {t('删除配置')}
            </Button>
          )}
        </Space>

        {!selectedGroup && configuredGroups.length === 0 && (
          <div style={{ marginBottom: 12 }}>
            <Text type='tertiary'>
              {t('请从上方选择分组添加动态倍率配置')}
            </Text>
          </div>
        )}

        {selectedGroup && config.mode === 'time' && (
          <TimeRangesTable
            ranges={currentGroupConfig.time_ranges || []}
            onChange={(ranges) =>
              updateGroupConfig(selectedGroup, 'time_ranges', ranges)
            }
          />
        )}

        {selectedGroup && config.mode === 'rpm' && (
          <RPMRangesTable
            ranges={currentGroupConfig.rpm_ranges || []}
            onChange={(ranges) =>
              updateGroupConfig(selectedGroup, 'rpm_ranges', ranges)
            }
          />
        )}
      </div>
    </Space>
  );
}

function TimeRangesTable({ ranges, onChange }) {
  const { t } = useTranslation();

  const addRange = () => {
    onChange([...ranges, { start_hour: 0, end_hour: 24, ratio: 1.0 }]);
  };

  const updateRange = (index, field, value) => {
    const newRanges = ranges.map((r, i) =>
      i === index ? { ...r, [field]: value } : r,
    );
    onChange(newRanges);
  };

  const deleteRange = (index) => {
    onChange(ranges.filter((_, i) => i !== index));
  };

  const columns = [
    {
      title: t('开始时间'),
      dataIndex: 'start_hour',
      render: (text, record, index) => (
        <InputNumber
          value={text}
          onChange={(val) => updateRange(index, 'start_hour', val)}
          min={0}
          max={23}
          suffix={t('时')}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: t('结束时间'),
      dataIndex: 'end_hour',
      render: (text, record, index) => (
        <InputNumber
          value={text}
          onChange={(val) => updateRange(index, 'end_hour', val)}
          min={0}
          max={24}
          suffix={t('时')}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: t('倍率'),
      dataIndex: 'ratio',
      render: (text, record, index) => (
        <InputNumber
          value={text}
          onChange={(val) => updateRange(index, 'ratio', val)}
          min={0}
          step={0.1}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: t('操作'),
      render: (_, record, index) => (
        <Button
          icon={<IconDelete />}
          type='danger'
          size='small'
          onClick={() => deleteRange(index)}
        />
      ),
    },
  ];

  return (
    <div>
      <Table
        columns={columns}
        dataSource={ranges.map((r, i) => ({ ...r, key: i }))}
        pagination={false}
        size='small'
        empty={t('暂无时间段配置')}
      />
      <Button
        icon={<IconPlus />}
        onClick={addRange}
        style={{ marginTop: 8 }}
        size='small'
      >
        {t('添加时间段')}
      </Button>
    </div>
  );
}

function RPMRangesTable({ ranges, onChange }) {
  const { t } = useTranslation();

  const addRange = () => {
    onChange([...ranges, { min_rpm: 0, max_rpm: -1, ratio: 1.0 }]);
  };

  const updateRange = (index, field, value) => {
    const newRanges = ranges.map((r, i) =>
      i === index ? { ...r, [field]: value } : r,
    );
    onChange(newRanges);
  };

  const deleteRange = (index) => {
    onChange(ranges.filter((_, i) => i !== index));
  };

  const columns = [
    {
      title: t('最小RPM'),
      dataIndex: 'min_rpm',
      render: (text, record, index) => (
        <InputNumber
          value={text}
          onChange={(val) => updateRange(index, 'min_rpm', val)}
          min={0}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: t('最大RPM'),
      dataIndex: 'max_rpm',
      render: (text, record, index) => (
        <Space>
          <InputNumber
            value={text}
            onChange={(val) => updateRange(index, 'max_rpm', val)}
            min={-1}
            style={{ width: 100 }}
          />
          {text === -1 && (
            <Text type='tertiary' size='small'>
              {t('无上限')}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t('倍率'),
      dataIndex: 'ratio',
      render: (text, record, index) => (
        <InputNumber
          value={text}
          onChange={(val) => updateRange(index, 'ratio', val)}
          min={0}
          step={0.1}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: t('操作'),
      render: (_, record, index) => (
        <Button
          icon={<IconDelete />}
          type='danger'
          size='small'
          onClick={() => deleteRange(index)}
        />
      ),
    },
  ];

  return (
    <div>
      <Table
        columns={columns}
        dataSource={ranges.map((r, i) => ({ ...r, key: i }))}
        pagination={false}
        size='small'
        empty={t('暂无RPM区间配置')}
      />
      <Button
        icon={<IconPlus />}
        onClick={addRange}
        style={{ marginTop: 8 }}
        size='small'
      >
        {t('添加RPM区间')}
      </Button>
      <Text
        type='tertiary'
        size='small'
        style={{ marginLeft: 8, display: 'block', marginTop: 4 }}
      >
        {t('最大RPM设为-1表示无上限')}
      </Text>
    </div>
  );
}
