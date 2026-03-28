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
import CardPro from '../../common/ui/CardPro';
import RegistrationCodesTable from './RegistrationCodesTable';
import RegistrationCodesActions from './RegistrationCodesActions';
import RegistrationCodesFilters from './RegistrationCodesFilters';
import RegistrationCodesDescription from './RegistrationCodesDescription';
import EditRegistrationCodeModal from './modals/EditRegistrationCodeModal';
import { useRegistrationCodesData } from '../../../hooks/registration-codes/useRegistrationCodesData';
import { useIsMobile } from '../../../hooks/common/useIsMobile';
import { createCardProPagination } from '../../../helpers/utils';

const RegistrationCodesPage = () => {
  const codesData = useRegistrationCodesData();
  const isMobile = useIsMobile();

  const {
    showEdit,
    editingCode,
    closeEdit,
    refresh,
    selectedKeys,
    setEditingCode,
    setShowEdit,
    batchCopyCodes,
    batchDeleteCodes,
    formInitValues,
    setFormApi,
    searchRegistrationCodes,
    loading,
    searching,
    compactMode,
    setCompactMode,
    t,
  } = codesData;

  return (
    <>
      <EditRegistrationCodeModal
        refresh={refresh}
        editingCode={editingCode}
        visiable={showEdit}
        handleClose={closeEdit}
      />

      <CardPro
        type='type1'
        descriptionArea={
          <RegistrationCodesDescription
            compactMode={compactMode}
            setCompactMode={setCompactMode}
            t={t}
          />
        }
        actionsArea={
          <div className='flex flex-col md:flex-row justify-between items-center gap-2 w-full'>
            <RegistrationCodesActions
              selectedKeys={selectedKeys}
              setEditingCode={setEditingCode}
              setShowEdit={setShowEdit}
              batchCopyCodes={batchCopyCodes}
              batchDeleteCodes={batchDeleteCodes}
              t={t}
            />

            <div className='w-full md:w-full lg:w-auto order-1 md:order-2'>
              <RegistrationCodesFilters
                formInitValues={formInitValues}
                setFormApi={setFormApi}
                searchRegistrationCodes={searchRegistrationCodes}
                loading={loading}
                searching={searching}
                t={t}
              />
            </div>
          </div>
        }
        paginationArea={createCardProPagination({
          currentPage: codesData.activePage,
          pageSize: codesData.pageSize,
          total: codesData.totalCount,
          onPageChange: codesData.handlePageChange,
          onPageSizeChange: codesData.handlePageSizeChange,
          isMobile: isMobile,
          t: codesData.t,
        })}
        t={codesData.t}
      >
        <RegistrationCodesTable {...codesData} />
      </CardPro>
    </>
  );
};

export default RegistrationCodesPage;
