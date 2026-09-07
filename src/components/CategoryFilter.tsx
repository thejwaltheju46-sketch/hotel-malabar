import React from 'react';
import { MenuCategory } from '../types';

interface CategoryFilterProps {
  categories: MenuCategory[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  categoryCounts: Record<string, number>;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  categoryCounts,
}) => {
  return (
    <div className="w-full bg-[#0d2819] border-b border-[#1b432a] py-3 sticky top-[108px] sm:top-[68px] z-30 shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[#235836] no-scrollbar">
          {/* All button */}
          <button
            onClick={() => onSelectCategory('all')}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedCategoryId === 'all'
                ? 'bg-[#dfb64c] text-[#0a1f13] shadow'
                : 'bg-[#123620] text-[#c9dcce] hover:bg-[#184428] border border-[#245937]'
            }`}
          >
            <span>All Menu</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedCategoryId === 'all' ? 'bg-[#0a1f13] text-[#dfb64c]' : 'bg-[#0a1f13]/60 text-[#9bb5a4]'
              }`}
            >
              {Object.values(categoryCounts).reduce((a: number, b: number) => a + b, 0)}
            </span>
          </button>

          {/* 22 Categories */}
          {categories
            .filter((c) => c.isActive)
            .map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-[#dfb64c] text-[#0a1f13] shadow'
                      : 'bg-[#123620] text-[#c9dcce] hover:bg-[#184428] border border-[#245937]'
                  }`}
                >
                  <span>{cat.name}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-[#0a1f13] text-[#dfb64c]' : 'bg-[#0a1f13]/60 text-[#9bb5a4]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};
