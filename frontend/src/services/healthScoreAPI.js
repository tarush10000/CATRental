const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const healthScoreAPI = {
    // Calculate user health score (admin only)
    calculateScore: async (userId, token) => {
        const response = await fetch(`${API_BASE_URL}/api/health-score/calculate/${userId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason }),
        });
        return response.json();
    },
};