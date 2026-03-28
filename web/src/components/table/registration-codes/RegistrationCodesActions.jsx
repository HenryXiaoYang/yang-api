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
import { Button } from '@douyinfe/semi-ui';

const RegistrationCodesActions = ({
  selectedKeys,
  setEditingCode,
  setShowEdit,
  batchCopyCodes,
  batchDeleteCodes,
  t,
}) => {
  const handleAddCode = () => {
    setEditingCode({ id: undefined });
    setShowEdit(true);
  };

  return (
    <div className='flex flex-wrap gap-2 w-full md:w-auto order-2 md:order-1'>
      <Button
        type='primary'
        className='flex-1 md:flex-initial'
        onClick={handleAddCode}
        size='small'
      >
        {t('添加注册码')}
      </Button>
      <Button
        type='tertiary'
        className='flex-1 md:flex-initial'
        onClick={batchCopyCodes}
        size='small'
      >
        {t('复制所选注册码到剪贴板')}
      </Button>
      <Button
        type='danger'
        className='w-full md:w-auto'
        onClick={batchDeleteCodes}
        size='small'
      >
        {t('清除失效注册码')}
      </Button>
    </div>
  );
};

export default RegistrationCodesActions;
