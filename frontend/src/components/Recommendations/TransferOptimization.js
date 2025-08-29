import React, { useState, useEffect } from 'react';
import { recommendationsAPI } from '../../services/recommendationsAPI';
import { Truck, DollarSign, MapPin, Users } from 'lucide-react';

const TransferOptimization = ({ token }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalSavings, setTotalSavings] = useState(0);

    useEffect(() => {
        fetchTransferRecommendations();
    }, []);

    const fetchTransferRecommendations = async () => {
        try {
            setLoading(true);
            const response = await recommendationsAPI.getTransferOptimization(100, token);
            if (response.success) {
                setRecommendations(response.data.recommendations);
                setTotalSavings(response.data.total_potential_savings);
            }
        } catch (error) {
            console.error('Error fetching transfer recommendations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTransfer = async (recommendation) => {
        try {
            const transferData = {
                from_user_id: recommendation.from_user_id,
                to_user_id: recommendation.to_user_id,
                machine_id: recommendation.machine_id,
                target_location_lat: parseFloat(recommendation.target_location.split(', ')[0]),
                target_location_lon: parseFloat(recommendation.target_location.split(', ')[1]),
            };

            const response = await recommendationsAPI.createDirectTransfer(transferData, token);
            if (response.success) {
                alert('Transfer request created successfully!');
                fetchTransferRecommendations(); // Refresh recommendations
            }
        } catch (error) {
            console.error('Error creating transfer:', error);
            alert('Failed to create transfer request');
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (loading) {
        return <div className="text-center p-8">Loading transfer recommendations...</div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="w-5 h-5" />
                        Transfer Optimization
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                        Direct machine transfers can save time and transportation costs
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-blue-600" />
                                <span className="font-medium">Total Potential Savings</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-600">${totalSavings.toFixed(2)}</p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Truck className="w-5 h-5 text-green-600" />
                                <span className="font-medium">Optimization Opportunities</span>
                            </div>
                            <p className="text-2xl font-bold text-green-600">{recommendations.length}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {recommendations.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                No transfer optimization opportunities found at this time.
                            </p>
                        ) : (
                            recommendations.map((rec, index) => (
                                <Card key={index} className="border-l-4 border-l-blue-500">
                                    <CardContent className="pt-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <Badge className={getPriorityColor(rec.priority)}>
                                                    {rec.priority.toUpperCase()} PRIORITY
                                                </Badge>
                                                <Badge variant="outline">
                                                    ${rec.estimated_savings} savings
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <h4 className="font-medium flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    Transfer Details
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    From: <span className="font-medium">{rec.from_user_name}</span>
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    To: <span className="font-medium">{rec.to_user_name}</span>
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    Machine: <span className="font-medium">{rec.machine_type} ({rec.machine_id})</span>
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className="font-medium flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    Distance Saved
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    {rec.distance_saved.toFixed(1)} km saved
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    Current: {rec.current_location}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    Target: {rec.target_location}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-700 mb-4">{rec.reason}</p>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleCreateTransfer(rec)}
                                                className="bg-blue-600 hover:bg-blue-700"
                                                size="sm"
                                            >
                                                Create Transfer Request
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TransferOptimization;