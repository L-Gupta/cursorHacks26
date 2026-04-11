import { useEffect, useRef, memo } from 'react';

function StockChartInner({ symbol, exchange }) {
  const containerRef = useRef(null);

  const tvSymbol = exchange && exchange !== 'OTHER'
    ? `${exchange}:${symbol}`
    : symbol;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(6, 10, 18, 1)',
      gridColor: 'rgba(0, 212, 255, 0.04)',
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [tvSymbol]);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        MARKET DATA — {symbol}
      </div>
      <div className="flex-1 min-h-0" ref={containerRef} />
    </div>
  );
}

export default memo(StockChartInner);
