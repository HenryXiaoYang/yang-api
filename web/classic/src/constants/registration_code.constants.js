export const REGISTRATION_CODE_STATUS = {
 ACTIVE: 1,
  DISABLED: 2,
  USED: 3,
};

export const REGISTRATION_CODE_STATUS_MAP = {
  [REGISTRATION_CODE_STATUS.ACTIVE]: {
    color: 'green',
    text: '可用',
 },
  [REGISTRATION_CODE_STATUS.DISABLED]: {
    color: 'red',
    text: '已禁用',
  },
 [REGISTRATION_CODE_STATUS.USED]: {
    color: 'grey',
    text: '已使用',
 },
};

export const REGISTRATION_CODE_ACTIONS = {
  DELETE: 'delete',
  ENABLE: 'enable',
  DISABLE: 'disable',
};
