import React, { useState, useEffect } from 'react';
import { getTodayMenu } from '../../utils/hms_api';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../hooks/use-toast';
import {
  ChefHat,
  Clock,
  Leaf,
} from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  vegetarian: boolean;
  cost: number;
  calories?: number;
}

interface Meal {
  id: number;
  meal_type: number;
  meal_type_detail: {
    name: string;
    time_from: string;
    time_to: string;
  };
  items: MenuItem[];
  day_name?: string;
}

const StudentMealManagement: React.FC = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const isDark = theme === 'dark';

  const [todayMenu, setTodayMenu] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTodayMenu();
  }, []);

  const loadTodayMenu = async () => {
    setLoading(true);
    try {
      const todayRes = await getTodayMenu();
      if (todayRes.success && todayRes.results) {
        setTodayMenu(todayRes.results);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load today\'s menu',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} p-6 shadow-sm`}>
      <div className="mb-6 flex items-center gap-3">
        <ChefHat className={`h-6 w-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Today's Menu
        </h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className={`h-6 w-6 animate-spin rounded-full border-4 ${isDark ? 'border-slate-700 border-t-orange-400' : 'border-gray-300 border-t-orange-600'}`} />
        </div>
      ) : todayMenu.length === 0 ? (
        <div className={`rounded-lg border-2 border-dashed ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-50'} py-6 text-center`}>
          <ChefHat className={`mx-auto h-10 w-10 ${isDark ? 'text-slate-600' : 'text-gray-400'}`} />
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            No meals scheduled for today
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {todayMenu.map((meal) => (
            <div
              key={meal.id}
              className={`rounded-lg border ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'} p-4`}
            >
              <h4 className={`mb-3 text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {meal.meal_type_detail.name}
              </h4>
              <p className={`mb-3 flex items-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <Clock className="mr-2 h-4 w-4" />
                {meal.meal_type_detail.time_from} - {meal.meal_type_detail.time_to}
              </p>
              <div className="flex flex-wrap gap-2">
                {meal.items.map((item) => (
                  <span
                    key={item.id}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                      item.vegetarian
                        ? isDark
                          ? 'bg-green-900/30 text-green-300'
                          : 'bg-green-100 text-green-700'
                        : isDark
                          ? 'bg-red-900/30 text-red-300'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.vegetarian && <Leaf className="h-3 w-3" />}
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentMealManagement;
