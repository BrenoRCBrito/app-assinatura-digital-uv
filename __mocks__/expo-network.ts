export const addNetworkStateListener = jest.fn(() => ({ remove: jest.fn() }));

export const getNetworkStateAsync = jest.fn(async () => ({
  type: 'WIFI',
  isConnected: true,
  isInternetReachable: true,
}));
