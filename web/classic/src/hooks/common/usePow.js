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

import { useState, useCallback, useRef } from 'react';
import { API } from '../../helpers';

/**
 * PoW Hook - 封装 Proof of Work 的获取和计算逻辑
 * @returns {Object} { solveChallenge, solving, progress, error }
 */
export function usePow() {
  const [solving, setSolving] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const workerRef = useRef(null);

  /**
   * 获取 PoW challenge 并计算解答
   * @param {string} action - 动作类型，如 'checkin'
   * @returns {Promise<{challenge_id: string, nonce: string} | null>}
   */
  const solveChallenge = useCallback(async (action = 'checkin') => {
    setError(null);
    setProgress(null);
    setSolving(true);

    try {
      // 1. 获取 challenge
      const res = await API.get(`/api/user/pow/challenge?action=${action}`);
      const { success, data, message } = res.data;

      if (!success) {
        throw new Error(message || 'Failed to get PoW challenge');
      }

      const { challenge_id, prefix, difficulty } = data;

      // 2. 创建 Web Worker 计算 PoW
      return await new Promise((resolve, reject) => {
        // 清理旧 worker
        if (workerRef.current) {
          workerRef.current.terminate();
        }

        // 使用 URL 构造器加载 worker
        const worker = new Worker(
          new URL('../../workers/pow.worker.js', import.meta.url),
          { type: 'module' },
        );
        workerRef.current = worker;

        worker.onmessage = (e) => {
          const { type, nonce, attempts, message: errMsg } = e.data;

          switch (type) {
            case 'solved':
              setSolving(false);
              setProgress({ attempts, completed: true });
              worker.terminate();
              workerRef.current = null;
              resolve({ challenge_id, nonce });
              break;

            case 'progress':
              setProgress({ attempts, completed: false });
              break;

            case 'error':
              setSolving(false);
              setError(errMsg);
              worker.terminate();
              workerRef.current = null;
              reject(new Error(errMsg));
              break;
          }
        };

        worker.onerror = (err) => {
          setSolving(false);
          setError(err.message || 'Worker error');
          worker.terminate();
          workerRef.current = null;
          reject(err);
        };

        // 开始计算
        worker.postMessage({ prefix, difficulty });
      });
    } catch (err) {
      setSolving(false);
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * 取消正在进行的计算
   */
  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setSolving(false);
    setProgress(null);
  }, []);

  return {
    solveChallenge,
    solving,
    progress,
    error,
    cancel,
  };
}

export default usePow;
