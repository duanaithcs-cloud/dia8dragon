
import React from 'react';
import { Topic } from '../types';

interface HeatmapProps {
  topics: Topic[];
  onTopicClick: (id: number) => void;
}

const Heatmap: React.FC<HeatmapProps> = ({ topics, onTopicClick }) => {
  const groupedTopics = topics.reduce((acc, t) => {
    if (!acc[t.group_title]) acc[t.group_title] = [];
    acc[t.group_title].push(t);
    return acc;
  }, {} as Record<string, Topic[]>);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar">
      <div className="space-y-8">
        {/* Fix: Explicitly cast Object.entries to ensure 'list' is correctly typed as Topic[] for line 24 */}
        {(Object.entries(groupedTopics) as [string, Topic[]][]).map(([group, list]) => (
          <div key={group} className="space-y-4">
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest border-l-2 border-primary pl-3">{group}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {list.map(t => (
                <div 
                  key={t.topic_id} 
                  onClick={() => onTopicClick(t.topic_id)}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-500 w-4">{t.topic_id}</span>
                    <span className="text-xs font-medium text-gray-300 group-hover:text-white truncate">{t.keyword_label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className={`text-[10px] font-bold ${t.mastery_percent > 80 ? 'text-c4-green' : (t.mastery_percent < 50 ? 'text-danger-glow' : 'text-primary')}`}>{t.mastery_percent}%</span>
                        <div className="w-12 h-1 bg-white/10 rounded-full mt-0.5 overflow-hidden">
                            <div className={`h-full ${t.mastery_percent > 80 ? 'bg-c4-green' : (t.mastery_percent < 50 ? 'bg-danger-glow' : 'bg-primary')}`} style={{ width: `${t.mastery_percent}%` }}></div>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="h-20"></div>
    </div>
  );
};

export default Heatmap;
