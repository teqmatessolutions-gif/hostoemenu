
import API from './api';

const foodService = {
    getAllFoodItems: async () => {
        try {
            const response = await API.get('/food-items/?limit=10000');
            return response.data;
        } catch (error) {
            console.error('Error fetching food items:', error);
            throw error;
        }
    },

    // Add other food-related services here as needed
};

export default foodService;
