import jsonpatch from 'fast-json-patch';
import { UseMutateFunction, useMutation, useQueryClient } from 'react-query';

import type { User } from '../../../../../shared/types';
import { axiosInstance, getJWTHeader } from '../../../axiosInstance';
import { queryKeys } from '../../../react-query/constants';
import { useCustomToast } from '../../app/hooks/useCustomToast';
import { useUser } from './useUser';

// for when we need a server function
async function patchUserOnServer(
  newData: User | null,
  originalData: User | null,
): Promise<User | null> {
  if (!newData || !originalData) return null;
  // create a patch for the difference between newData and originalData
  const patch = jsonpatch.compare(originalData, newData);

  // send patched data to the server
  const { data } = await axiosInstance.patch(
    `/user/${originalData.id}`,
    { patch },
    {
      headers: getJWTHeader(originalData),
    },
  );
  return data.user;
}

// TODO: update type to UseMutateFunction type
export function usePatchUser(): UseMutateFunction<
  User,
  unknown,
  User,
  unknown
> {
  const queryClient = useQueryClient();
  const { user, updateUser } = useUser();
  const toast = useCustomToast();

  const { mutate: patchUser } = useMutation(
    (newUserData: User) => patchUserOnServer(newUserData, user),
    {
      // onMutate는 onError에 인수로 전달될 context값을 리턴
      onMutate: async (newData: User | null) => {
        // 사용자 데이터를 대상으로 한 쿼리는 모두 취소 -> 오래된 서버 데이터는 낙관적 업데이트를 덮어쓰지 않는다
        queryClient.cancelQueries(queryKeys.user);

        // 이전 사용자의 데이터 저장해두고
        const previousUserData: User = queryClient.getQueryData(queryKeys.user);

        // 캐시를 새로운 값으로 낙관전 업데이트
        updateUser(newData);

        // return context object (저장해둔 이전 사용자의 데이터)
        return { previousUserData };
      },
      onError: (error, newData, context) => {
        // 오류가 있는 경우, 저장된 값으로 캐시를 롤백
        if (context.previousUserData) {
          updateUser(context.previousUserData);
          toast({
            title: '수정에 실패했습니다',
            status: 'warning',
          });
        }
      },
      onSuccess: (userData: User | null) => {
        if (user) {
          // updateUser(userData); // 낙관적 업데이트를 했기 때문에 불필요
          toast({
            title: '수정되었습니다.',
            status: 'success',
          });
        }
      },
      // 변이 후, 성공 여부와 관계없이 실행
      onSettled: () => {
        // 사용자에 대한 데이터를 무효화하여 서버에서 최신 데이터를 보여줄 수 있도록 함
        queryClient.invalidateQueries(queryKeys.user);
      },
    },
  );

  return patchUser;
}
