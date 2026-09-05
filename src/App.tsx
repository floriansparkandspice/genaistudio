/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

if (typeof window !== 'undefined' && window.location.hostname.includes('ai.studio')) {
  window.location.replace('https://genaistudio.one' + window.location.pathname + window.location.search);
}

export default function App() {
  return <div></div>;
}
