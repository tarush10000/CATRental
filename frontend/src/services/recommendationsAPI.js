const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const recommendationsAPI = {
    // Get transfer recommendations
    getTransfers: async (status, token) => {
        const url = status ?
            `${API_BASE_URL}/api/recommendations/transfers?status=${status}` :
            `${API_BASE_URL}/api/recommendations/transfers`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    },

    // Update transfer status
    updateTransfer: async (transferId, updateData, token) => {
        const response = await fetch(`${API_BASE_URL}/api/recommendations/transfers/${transferId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });
        return response.json();
    },

    // Get transfer optimization recommendations
    getTransferOptimization: async (maxDistance, token) => {
        const url = maxDistance ?
            `${API_BASE_URL}/api/recommendations/transfer-optimization?max_distance=${maxDistance}` :
            `${API_BASE_URL}/api/recommendations/transfer-optimization`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    },

    // Get usage optimization recommendations
    getUsageOptimization: async (userId, token) => {
        const url = userId ?
            `${API_BASE_URL}/api/recommendations/usage-optimization?user_id=${userId}` :
            `${API_BASE_URL}/api/recommendations/usage-optimization`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    },

    // Create direct transfer
    createDirectTransfer: async (transferData, token) => {
        const response = await fetch(`${API_BASE_URL}/api/recommendations/create-transfer`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transferData),
        });
        return response.json();
    },

    // Get all recommendations
    getAllRecommendations: async (filters, token) => {
        const params = new URLSearchParams();
        if (filters.type) params.append('recommendation_type', filters.type);
        if (filters.status) params.append('status', filters.status);
        if (filters.limit) params.append('limit', filters.limit);

        const url = `${API_BASE_URL}/api/recommendations/?${params.toString()}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    },

    // Dismiss recommendation
    dismissRecommendation: async (recommendationId, token) => {
        const response = await fetch(`${API_BASE_URL}/api/recommendations/${recommendationId}/dismiss`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    },

    // Get machine locations
    getMachineLocations: async (token) => {
        const response = await fetch(`${API_BASE_URL}/api/recommendations/machine-locations`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    },
};