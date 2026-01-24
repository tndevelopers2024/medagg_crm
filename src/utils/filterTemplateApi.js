import { apiClient as api } from './api';

export const fetchFilterTemplates = async () => {
    const { data } = await api.get('/filter-templates');
    return data;
};

export const getFilterTemplate = async (id) => {
    const { data } = await api.get(`/filter-templates/${id}`);
    return data;
};

export const createFilterTemplate = async (templateData) => {
    const { data } = await api.post('/filter-templates', templateData);
    return data;
};

export const updateFilterTemplate = async (id, templateData) => {
    const { data } = await api.put(`/filter-templates/${id}`, templateData);
    return data;
};

export const deleteFilterTemplate = async (id) => {
    const { data } = await api.delete(`/filter-templates/${id}`);
    return data;
};

export const setDefaultTemplate = async (id) => {
    const { data } = await api.put(`/filter-templates/${id}/set-default`);
    return data;
};

export const applyFilterTemplate = async (id) => {
    const { data } = await api.post(`/filter-templates/${id}/apply`);
    return data;
};
