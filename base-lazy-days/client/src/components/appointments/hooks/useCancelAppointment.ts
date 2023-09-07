import { UseMutateFunction, useMutation, useQueryClient } from 'react-query';

import { Appointment } from '../../../../../shared/types';
import { axiosInstance } from '../../../axiosInstance';
import { queryKeys } from '../../../react-query/constants';
import { useCustomToast } from '../../app/hooks/useCustomToast';

// for when server call is needed
async function removeAppointmentUser(appointment: Appointment): Promise<void> {
  const patchData = [{ op: 'remove', path: '/userId' }];
  await axiosInstance.patch(`/appointment/${appointment.id}`, {
    data: patchData,
  });
}

export function useCancelAppointment(): UseMutateFunction<
  void, // 반환하는 mutate함수를 생성한 useMutation함수는 void 반환
  unknown, // 오류 유형 unknown
  Appointment, // 인수는 Appointment 타입
  unknown
> {
  const queryClient = useQueryClient();
  const toast = useCustomToast();

  const { mutate } = useMutation(removeAppointmentUser, {
    onSuccess: () => {
      queryClient.invalidateQueries([queryKeys.appointments]);
      toast({
        title: '예약이 취소되었습니다.',
        status: 'warning',
      });
    },
  });

  return mutate;
}
