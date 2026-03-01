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

/**
 * PoW Web Worker - 在后台线程中计算 Proof of Work
 * 使用 SHA-256 Hashcash 风格算法
 */

/**
 * 检查哈希是否有指定数量的前导零 bits
 * @param {Uint8Array} hash - SHA-256 哈希结果
 * @param {number} bits - 需要的前导零 bits 数
 * @returns {boolean}
 */
function hasLeadingZeroBits(hash, bits) {
  if (bits <= 0) return true;

  const fullBytes = Math.floor(bits / 8);
  const remainingBits = bits % 8;

  // 检查完整字节
  for (let i = 0; i < fullBytes && i < hash.length; i++) {
    if (hash[i] !== 0) {
      return false;
    }
  }

  // 检查剩余 bits
  if (remainingBits > 0 && fullBytes < hash.length) {
    // 创建掩码：如果 remainingBits = 3，掩码 = 11100000 = 0xE0
    const mask = 0xff << (8 - remainingBits);
    if ((hash[fullBytes] & mask) !== 0) {
      return false;
    }
  }

  return true;
}

/**
 * 将数字转换为 8 字符的十六进制字符串
 * @param {number} num
 * @returns {string}
 */
function toHex8(num) {
  return num.toString(16).padStart(8, '0');
}

/**
 * 处理消息
 */
self.onmessage = async function (e) {
  const { prefix, difficulty } = e.data;

  if (!prefix || typeof difficulty !== 'number') {
    self.postMessage({ type: 'error', message: 'Invalid parameters' });
    return;
  }

  let nonce = 0;
  const progressInterval = 50000; // 每 50000 次尝试报告一次进度

  try {
    while (true) {
      const nonceHex = toHex8(nonce);
      const data = new TextEncoder().encode(prefix + nonceHex);

      // 使用 Web Crypto API 计算 SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hash = new Uint8Array(hashBuffer);

      if (hasLeadingZeroBits(hash, difficulty)) {
        self.postMessage({
          type: 'solved',
          nonce: nonceHex,
          attempts: nonce + 1,
        });
        return;
      }

      // 报告进度
      if (nonce % progressInterval === 0 && nonce > 0) {
        self.postMessage({
          type: 'progress',
          attempts: nonce,
        });
      }

      nonce++;

      // 防止无限循环（设置一个合理的上限）
      if (nonce > 0xffffffff) {
        self.postMessage({
          type: 'error',
          message: 'Max attempts reached without solution',
        });
        return;
      }
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err.message || 'Unknown error during PoW calculation',
    });
  }
};
