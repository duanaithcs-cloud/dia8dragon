import React from 'react';

interface TopicIconProps {
  name?: string;
  topicId?: number;
  size?: number | string;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const TOPIC_ICON_BY_ID: Record<number, string> = {
  1: 'groups', 2: 'map', 3: 'work', 4: 'bar_chart', 5: 'agriculture',
  6: 'forest', 7: 'factory', 8: 'storefront', 9: 'travel_explore', 10: 'terrain',
  11: 'water', 12: 'landscape', 13: 'wb_sunny', 14: 'apartment', 15: 'waves',
  16: 'cyclone', 17: 'sailing', 18: 'location_city', 19: 'temple_buddhist', 20: 'gavel'
};

const ICON_ALIASES: Record<string, string> = {
  'bar chart': 'bar_chart',
  'barchart': 'bar_chart',
  'location city': 'location_city',
  'travel explore': 'travel_explore',
  'wb sunny': 'wb_sunny',
  'temple buddhist': 'temple_buddhist'
};

const TopicIcon: React.FC<TopicIconProps> = ({ name = '', topicId, size = 28, className = '', title, style }) => {
  const rawName = name.trim().toLowerCase();
  const iconName = (topicId && TOPIC_ICON_BY_ID[topicId]) || ICON_ALIASES[rawName] || rawName || 'map';
  const content = (() => {
    switch (iconName) {
      case 'groups':
        return <><circle cx="8" cy="8" r="2.6" {...common}/><circle cx="16" cy="8.5" r="2.2" {...common}/><path d="M3.8 18c.5-3.2 2.2-4.8 4.6-4.8s4.1 1.6 4.6 4.8" {...common}/><path d="M13.2 14c2.8-.6 5.4.9 6.4 3.6" {...common}/></>;
      case 'map':
        return <><path d="M3.5 5.2 9 3l6 2.2L20.5 3v15.8L15 21l-6-2.2L3.5 21Z" {...common}/><path d="M9 3v15.8M15 5.2V21" {...common}/></>;
      case 'work':
        return <><rect x="3" y="7" width="18" height="12" rx="2" {...common}/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12h18M10 12v2h4v-2" {...common}/></>;
      case 'bar_chart':
        return <><path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7M3 20h18" {...common}/></>;
      case 'agriculture':
        return <><path d="M12 21v-8" {...common}/><path d="M12 14c-4.2 0-7-2.5-7-6.4 4.2 0 7 2.5 7 6.4ZM12 11.5c.2-4 2.6-6.5 6.8-6.5 0 4.1-2.4 6.5-6.8 6.5Z" {...common}/><path d="M5 21h14" {...common}/></>;
      case 'forest':
        return <><path d="m7 4-4 7h3l-3 5h8l-3-5h3ZM16 3l-4 7h3l-3 6h8l-3-6h3Z" {...common}/><path d="M7 16v5M16 16v5" {...common}/></>;
      case 'factory':
        return <><path d="M3 21V9l6 3V8l6 3V5h4v16Z" {...common}/><path d="M7 17h2M12 17h2M17 17h2" {...common}/></>;
      case 'storefront':
        return <><path d="M4 9h16l-2-5H6Z" {...common}/><path d="M5 9v11h14V9M9 20v-6h6v6" {...common}/><path d="M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0" {...common}/></>;
      case 'travel_explore':
        return <><circle cx="10.5" cy="10.5" r="6.5" {...common}/><path d="M5 10.5h11M10.5 4c2 2 2 11 0 13M10.5 4c-2 2-2 11 0 13M15.2 15.2 21 21" {...common}/></>;
      case 'terrain':
        return <><path d="m2.5 20 6.4-10 3.3 4.8L15.4 10l6.1 10Z" {...common}/><path d="m7.2 12.6 1.7 1.5 1.3-1.2M14.1 12 16 14l1.4-1.2" {...common}/></>;
      case 'water':
        return <path d="M12 3s6.3 7.1 6.3 11.4A6.3 6.3 0 1 1 5.7 14.4C5.7 10.1 12 3 12 3Z" {...common}/>;
      case 'landscape':
        return <><circle cx="17.5" cy="6.5" r="2.5" {...common}/><path d="m3 20 6-9 3.2 4.4 2.4-3.2L21 20Z" {...common}/></>;
      case 'wb_sunny':
        return <><circle cx="12" cy="12" r="4" {...common}/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" {...common}/></>;
      case 'apartment':
        return <><path d="M5 21V4h10v17M15 9h4v12M8 8h2M8 12h2M8 16h2M12 8h1M12 12h1M12 16h1M17 13h1M17 17h1M3 21h18" {...common}/></>;
      case 'waves':
        return <><path d="M2 8c2.2 0 2.2 2 4.4 2s2.2-2 4.4-2 2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2" {...common}/><path d="M2 13c2.2 0 2.2 2 4.4 2s2.2-2 4.4-2 2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2" {...common}/><path d="M2 18c2.2 0 2.2 2 4.4 2s2.2-2 4.4-2 2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2" {...common}/></>;
      case 'cyclone':
        return <path d="M20 10.5c-1.2-4.1-5.7-6.5-9.8-5.2-3.6 1.1-5.7 4.9-4.6 8.4.9 3 4 4.8 7 3.9 2.5-.8 4-3.4 3.2-5.9-.6-2-2.7-3.2-4.8-2.6-1.6.5-2.6 2.2-2.1 3.8.4 1.2 1.7 2 2.9 1.6" {...common}/>;
      case 'sailing':
        return <><path d="M4 17h16c-1.3 2.7-4 4-8 4s-6.7-1.3-8-4Z" {...common}/><path d="M12 3v14M11.5 4 6 14h5.5M12.5 5l5.5 9h-5.5" {...common}/></>;
      case 'location_city':
        return <><path d="M3 21V9h6v12M9 21V4h7v17M16 21v-8h5v8M6 12h1M6 16h1M12 8h1M12 12h1M12 16h1M18 16h1M18 19h1M2 21h20" {...common}/></>;
      case 'temple_buddhist':
        return <><path d="m12 3 2 3h-4ZM6 8h12l-2 3H8ZM5 13h14l-2 3H7ZM8 16v5M16 16v5M5 21h14" {...common}/></>;
      case 'gavel':
        return <><path d="m14.5 4 5.5 5.5-3 3L11.5 7ZM10 8.5l5.5 5.5-3 3L7 11.5ZM13.5 13.5 20 20M3 20h8" {...common}/></>;
      default:
        return <><circle cx="12" cy="12" r="8.5" {...common}/><path d="M8.5 12h7M12 8.5v7" {...common}/></>;
    }
  })();

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      style={{ display: 'block', color: 'currentColor', ...style }}
    >
      {title && <title>{title}</title>}
      {content}
    </svg>
  );
};

export default TopicIcon;
