import * as coinRepository from '../repositories/coin.repository';
import * as cmcService from './coinmarketcap.service';

let intervalId: NodeJS.Timeout | null = null;
let isUpdating = false;

const updateAllPrices = async () => {
  if (isUpdating) {
    console.log('[Scheduler] Previous update is still running. Skipping this cycle...');
    return;
  }
  
  try {
    isUpdating = true;
    console.log(`[Scheduler] Starting scheduled price update at ${new Date().toISOString()}`);
    
    const coins = await coinRepository.getAllCoins();
    for (const coin of coins) {
      try {
        const price = await cmcService.fetchPriceFromCMC(coin.symbol);
        await coinRepository.addPriceHistory(coin.id, price);
        console.log(`[Scheduler] Updated ${coin.symbol}: $${price}`);
      } catch (error: any) {
        console.error(`[Scheduler] Failed to update ${coin.symbol}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[Scheduler] Critical error during update cycle:', error);
  } finally {
    isUpdating = false; 
  }
};

export const startScheduler = () => {
  const INTERVAL_MS = 5 * 60 * 1000;
  
  updateAllPrices();
  
  intervalId = setInterval(updateAllPrices, INTERVAL_MS);
  console.log(`[Scheduler] Started. Interval: ${INTERVAL_MS / 1000} seconds.`);
};

export const stopScheduler = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Scheduler] Stopped.');
  }
};