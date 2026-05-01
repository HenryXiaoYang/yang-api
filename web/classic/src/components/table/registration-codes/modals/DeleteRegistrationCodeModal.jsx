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

import React from 'react';
import { Modal } from '@douyinfe/semi-ui';
import { REGISTRATION_CODE_ACTIONS } from '../../../../constants/registration_code.constants';

const DeleteRegistrationCodeModal = ({
  visible,
  onCancel,
  record,
  manageRegistrationCode,
  refresh,
  registrationCodes,
  activePage,
  t,
}) => {
  const handleConfirm = async () => {
    await manageRegistrationCode(
      record.id,
      REGISTRATION_CODE_ACTIONS.DELETE,
      record,
    );
    await refresh();
    setTimeout(() => {
      if (registrationCodes.length === 0 && activePage > 1) {
        refresh(activePage - 1);
      }
    }, 100);
    onCancel();
  };

  return (
    <Modal
      title={t('确定是否要删除此注册码？')}
      visible={visible}
      onCancel={onCancel}
      onOk={handleConfirm}
      type='warning'
    >
      {t('此修改将不可逆')}
    </Modal>
  );
};

export default DeleteRegistrationCodeModal;
