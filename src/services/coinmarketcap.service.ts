import axios from 'axios';
import dotenv from 'dotenv';
import { ExternalApiError } from '../types/errors';

dotenv.config();

const CMC_API_KEY = process.env.CMC_API_KEY;
const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';

const cmcClient = axios.create({
  baseURL: CMC_BASE_URL,
  timeout: 5000, 
  headers: {
    'X-CMC_PRO_API_KEY': CMC_API_KEY,
  },
});

export interface CmcPriceResponse {
  data: {
    [symbol: string]: {
      quote: {
        USD: {
          price: number;
        };
      };
    };
  };
}

export const fetchPriceFromCMC = async (symbol: string, retries = 3): Promise<number> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await cmcClient.get<CmcPriceResponse>('/cryptocurrency/quotes/latest', {
        params: { symbol: symbol },
      });

      const price = response.data.data[symbol]?.quote?.USD?.price;
      
      if (price === undefined) {
        throw new ExternalApiError(`Price for ${symbol} not found in CMC response`);
      }

      return price;
      
    } catch (error: any) {
      console.error(`[CMC] Attempt ${attempt} failed: ${error.message}`);

      if (attempt === retries) {
        if (error.response && error.response.status === 429) {
          throw new ExternalApiError('CoinMarketCap Rate Limit Exceeded', 502);
        }
        throw new ExternalApiError('CoinMarketCap API is unavailable', 502);
      }

      let delay = 0;
      
      if (error.response?.headers['retry-after']) {
        delay = parseInt(error.response.headers['retry-after'], 10) * 1000;
      } else {
        const baseDelay = 1000;
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500; 
        delay = exponentialDelay + jitter;
      }

      console.log(`[CMC] Retrying in ${Math.round(delay)}ms...`);
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new ExternalApiError('CoinMarketCap API failed after retries', 502);
};