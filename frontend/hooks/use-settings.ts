import { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Category, UserSettings } from '@/types/api';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        setIsLoading(true);
        const data = await settingsApi.getSettings();
        setSettings(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
        setError('Failed to load settings. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to load settings',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        setIsLoading(true);
        const data = await settingsApi.getCategories();
        setCategories(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setError('Failed to load categories. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to load categories',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCategories();
  }, []);

  // Update settings
  const updateSettings = async (data: Partial<UserSettings>) => {
    try {
      setIsLoading(true);
      const updatedSettings = await settingsApi.updateSettings(data);
      setSettings(updatedSettings);
      toast({
        title: 'Success',
        description: 'Settings updated successfully',
      });
      return updatedSettings;
    } catch (err) {
      console.error('Failed to update settings:', err);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Create category
  const createCategory = async (data: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setIsLoading(true);
      const newCategory = await settingsApi.createCategory(data);
      setCategories(prevCategories => [...prevCategories, newCategory]);
      toast({
        title: 'Success',
        description: 'Category created successfully',
      });
      return newCategory;
    } catch (err) {
      console.error('Failed to create category:', err);
      toast({
        title: 'Error',
        description: 'Failed to create category',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update category
  const updateCategory = async (id: string, data: Partial<Category>) => {
    try {
      setIsLoading(true);
      const updatedCategory = await settingsApi.updateCategory(id, data);
      setCategories(prevCategories => 
        prevCategories.map(category => 
          category.id === id ? updatedCategory : category
        )
      );
      toast({
        title: 'Success',
        description: 'Category updated successfully',
      });
      return updatedCategory;
    } catch (err) {
      console.error('Failed to update category:', err);
      toast({
        title: 'Error',
        description: 'Failed to update category',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete category
  const deleteCategory = async (id: string) => {
    try {
      setIsLoading(true);
      await settingsApi.deleteCategory(id);
      setCategories(prevCategories => 
        prevCategories.filter(category => category.id !== id)
      );
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      });
    } catch (err) {
      console.error('Failed to delete category:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete category',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    settings,
    categories,
    isLoading,
    error,
    updateSettings,
    createCategory,
    updateCategory,
    deleteCategory
  };
} 