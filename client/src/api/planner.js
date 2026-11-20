import api from './axios';

export const getPlan = (week) => api.get('/planner', { params: { week } }).then((r) => r.data);
export const addPlanEntry = (week, entry) => api.post('/planner/entries', { week, ...entry }).then((r) => r.data);
export const updatePlanEntry = (week, id, changes) => api.patch(`/planner/entries/${id}`, { week, ...changes }).then((r) => r.data);
export const deletePlanEntry = (week, id) => api.delete(`/planner/entries/${id}`, { params: { week } }).then((r) => r.data);
export const autofillPlan = (week) => api.post('/planner/autofill', { week }).then((r) => r.data);
export const getPreferences = () => api.get('/planner/preferences').then((r) => r.data);
export const savePreferences = (prefs) => api.put('/planner/preferences', prefs).then((r) => r.data);
