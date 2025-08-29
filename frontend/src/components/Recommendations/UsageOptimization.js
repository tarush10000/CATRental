import React, { useState, useEffect } from 'react';
import { recommendationsAPI } from '../../services/recommendationsAPI';
import { BarChart, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';

const UsageOptimization = ({ token }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsageRecommendations();
    }, []);

    const fetchUsageRecommendations = async () => {
        try {
            setLoading(true);
            const response = await recommendationsAPI.getUsageOptimization(null, token);
            if (response.success) {
                setRecommendations(response.data.recommendations);
            }
        } catch (error) {
            console.error('Error fetching usage recommendations:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRecommendationIcon = (type) => {
        switch (type) {
            case 'reduce_machines': return <TrendingDown className="w-5 h-5 text-orange-600" />;
            case 'increase_machines': return <TrendingUp className="w-5 h-5 text-blue-600" />;
            case 'optimize_usage': return <CheckCircle className="w-5 h-5 text-green-600" />;
            default: return <BarChart className="w-5 h-5 text-gray-600" />;
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

    const getUtilizationColor = (utilization) => {
        if (utilization >= 40 && utilization <= 70) return 'text-green-600';
        if (utilization < 20) return 'text-orange-600';
        if (utilization > 85) return 'text-red-600';
        return 'text-yellow-600';
    };

    if (loading) {
        return <div className="text-center p-8">Loading usage recommendations...</div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart className="w-5 h-5" />
                        Usage Optimization
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                        Analyze machine utilization patterns and optimize fleet allocation
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recommendations.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                No usage optimization recommendations available.
                            </p>
                        ) : (
                            recommendations.map((rec, index) => (
                                <Card key={index} className="border-l-4 border-l-blue-500">
                                    <CardContent className="pt-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                {getRecommendationIcon(rec.recommendation_type)}
                                                <div>
                                                    <h4 className="font-medium">{rec.user_name}</h4>
                                                    <p className="text-sm text-gray-600">
                                                        Current utilization:
                                                        <span className={`font-medium ml-1 ${getUtilizationColor(rec.current_utilization)}`}>
                                                            {rec.current_utilization}%
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Badge className={getPriorityColor(rec.priority)}>
                                                    {rec.priority.toUpperCase()}
                                                </Badge>
                                                {rec.potential_savings && (
                                                    <Badge variant="outline">
                                                        ${rec.potential_savings} potential savings
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <h5 className="font-medium text-sm mb-2">Recommended Action:</h5>
                                            <p className="text-sm text-gray-700">{rec.recommended_action}</p>
                                        </div>

                                        <div className="mb-4">
                                            <h5 className="font-medium text-sm mb-2">Analysis:</h5>
                                            <p className="text-sm text-gray-600">{rec.reason}</p>
                                        </div>

                                        {rec.details && rec.details.length > 0 && (
                                            <div className="mb-4">
                                                <h5 className="font-medium text-sm mb-2">Affected Machines:</h5>
                                                <div className="space-y-1">
                                                    {rec.details.map((machine, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                                            <span>{machine.machine_type} ({machine.machine_id})</span>
                                                            <span className={`font-medium ${getUtilizationColor(machine.utilization)}`}>
                                                                {machine.utilization}% utilization
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {rec.recommendation_type !== 'optimize_usage' && (
                                            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded text-sm">
                                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                                <span className="text-yellow-800">
                                                    Consider reaching out to this customer to discuss fleet optimization
                                                </span>
                                            </div>
                                        )}
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

export default UsageOptimization;