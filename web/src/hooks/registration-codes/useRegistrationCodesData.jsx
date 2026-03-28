import { useState, useEffect } from 'react';
import { API, showError, showSuccess, copy } from '../../helpers';
import { ITEMS_PER_PAGE } from '../../constants';
import {
  REGISTRATION_CODE_ACTIONS,
  REGISTRATION_CODE_STATUS,
} from '../../constants/registration_code.constants';
import { Modal } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { useTableCompactMode } from '../common/useTableCompactMode';

export const useRegistrationCodesData = () => {
  const { t } = useTranslation();

  const [registrationCodes, setRegistrationCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState([]);

  const [editingCode, setEditingCode] = useState({ id: undefined });
  const [showEdit, setShowEdit] = useState(false);

  const [formApi, setFormApi] = useState(null);

  const [compactMode, setCompactMode] = useTableCompactMode('registration_codes');

  const formInitValues = { searchKeyword: '' };

  const getFormValues = () => {
    const formValues = formApi ? formApi.getValues() : {};
    return { searchKeyword: formValues.searchKeyword || '' };
  };

  const loadRegistrationCodes = async (page = 1, pageSizeParam) => {
    setLoading(true);
    try {
      const res = await API.get(
        `/api/registration_code/?p=${page}&page_size=${pageSizeParam}`,
      );
      const { success, message, data } = res.data;
      if (success) {
        setActivePage(data.page <= 0 ? 1 : data.page);
        setTotalCount(data.total);
        setRegistrationCodes(data.items);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    }
    setLoading(false);
  };

  const searchRegistrationCodes = async () => {
    const { searchKeyword } = getFormValues();
    if (searchKeyword === '') {
      await loadRegistrationCodes(1, pageSize);
      return;
    }
    setSearching(true);
    try {
      const res = await API.get(
        `/api/registration_code/search?keyword=${searchKeyword}&p=1&page_size=${pageSize}`,
      );
      const { success, message, data } = res.data;
      if (success) {
        setActivePage(data.page || 1);
        setTotalCount(data.total);
        setRegistrationCodes(data.items);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    }
    setSearching(false);
  };

  const manageRegistrationCode = async (id, action, record) => {
    setLoading(true);
    let data = { id };
    let res;

    try {
      switch (action) {
        case REGISTRATION_CODE_ACTIONS.DELETE:
          res = await API.delete(`/api/registration_code/${id}/`);
          break;
        case REGISTRATION_CODE_ACTIONS.ENABLE:
          data.status = REGISTRATION_CODE_STATUS.ACTIVE;
          res = await API.put('/api/registration_code/?status_only=true', data);
          break;
        case REGISTRATION_CODE_ACTIONS.DISABLE:
          data.status = REGISTRATION_CODE_STATUS.DISABLED;
          res = await API.put('/api/registration_code/?status_only=true', data);
          break;
        default:
          throw new Error('Unknown operation type');
      }

      const { success, message } = res.data;
      if (success) {
        showSuccess(t('操作成功完成！'));
        let code = res.data.data;
        let newCodes = [...registrationCodes];
        if (action !== REGISTRATION_CODE_ACTIONS.DELETE) {
          record.status = code.status;
        }
        setRegistrationCodes(newCodes);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message);
    }
    setLoading(false);
  };

  const refresh = async (page = activePage) => {
    const { searchKeyword } = getFormValues();
    if (searchKeyword === '') {
      await loadRegistrationCodes(page, pageSize);
    } else {
      await searchRegistrationCodes();
    }
  };

  const handlePageChange = (page) => {
    setActivePage(page);
    const { searchKeyword } = getFormValues();
    if (searchKeyword === '') {
      loadRegistrationCodes(page, pageSize);
    } else {
      searchRegistrationCodes();
    }
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setActivePage(1);
    const { searchKeyword } = getFormValues();
    if (searchKeyword === '') {
      loadRegistrationCodes(1, size);
    } else {
      searchRegistrationCodes();
    }
  };

  const rowSelection = {
    onSelect: (record, selected) => {},
    onSelectAll: (selected, selectedRows) => {},
    onChange: (selectedRowKeys, selectedRows) => {
      setSelectedKeys(selectedRows);
    },
  };

  const handleRow = (record, index) => {
    const isExpired = (rec) => {
      return (
        rec.status === REGISTRATION_CODE_STATUS.ACTIVE &&
        rec.expired_time !== 0 &&
        rec.expired_time < Math.floor(Date.now() / 1000)
      );
    };

    if (record.status !== REGISTRATION_CODE_STATUS.ACTIVE || isExpired(record)) {
      return {
        style: {
          background: 'var(--semi-color-disabled-border)',
        },
      };
    } else {
      return {};
    }
  };

  const copyText = async (text) => {
    if (await copy(text)) {
      showSuccess(t('已复制到剪贴板！'));
    } else {
      Modal.error({
        title: t('无法复制到剪贴板，请手动复制'),
        content: text,
        size: 'large',
      });
    }
  };

  const batchCopyCodes = async () => {
    if (selectedKeys.length === 0) {
      showError(t('请至少选择一个注册码！'));
      return;
    }
    let keys = '';
    for (let i = 0; i < selectedKeys.length; i++) {
      keys += selectedKeys[i].name + '    ' + selectedKeys[i].code + '\n';
    }
    await copyText(keys);
  };

  const batchDeleteCodes = async () => {
    Modal.confirm({
      title: t('确定清除所有失效注册码？'),
      content: t('将删除已使用、已禁用及过期的注册码，此操作不可撤销。'),
      onOk: async () => {
        setLoading(true);
        const res = await API.delete('/api/registration_code/invalid');
        const { success, message, data } = res.data;
        if (success) {
          showSuccess(t('已删除 {{count}} 条失效注册码', { count: data }));
          await refresh();
        } else {
          showError(message);
        }
        setLoading(false);
      },
    });
  };

  const closeEdit = () => {
    setShowEdit(false);
    setTimeout(() => {
      setEditingCode({ id: undefined });
    }, 500);
  };

  const removeRecord = (code) => {
    let newDataSource = [...registrationCodes];
    if (code != null) {
      let idx = newDataSource.findIndex((data) => data.code === code);
      if (idx > -1) {
        newDataSource.splice(idx, 1);
        setRegistrationCodes(newDataSource);
      }
    }
  };

  useEffect(() => {
    loadRegistrationCodes(1, pageSize)
      .then()
      .catch((reason) => {
        showError(reason);
      });
  }, [pageSize]);

  return {
    registrationCodes,
    loading,
    searching,
    activePage,
    pageSize,
    totalCount,
    selectedKeys,
    editingCode,
    showEdit,
    formApi,
    formInitValues,
    compactMode,
    setCompactMode,
    loadRegistrationCodes,
    searchRegistrationCodes,
    manageRegistrationCode,
    refresh,
    copyText,
    removeRecord,
    setActivePage,
    setPageSize,
    setSelectedKeys,
    setEditingCode,
    setShowEdit,
    setFormApi,
    setLoading,
    handlePageChange,
    handlePageSizeChange,
    rowSelection,
    handleRow,
    closeEdit,
    getFormValues,
    batchCopyCodes,
    batchDeleteCodes,
    t,
  };
};
