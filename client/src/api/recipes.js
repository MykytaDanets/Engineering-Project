import api from './axios';

export const getRecipes = () => api.get('/recipes').then((r) => r.data);
export const getRecipeInfo = (id) => api.get(`/recipes/${id}/info`).then((r) => r.data);
