import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const HealthScoreCard = ({ userDetails, showActions = false, onCalculateScore }) => {
    if (!userDetails) return null;

    const {
        health_score,
        score_category,
        score_color,
        score_last_updated,
        name,
        email
    } = userDetails;

    const getScoreIcon = (score, previousScore) => {
        if (!previousScore) return <Minus className="w-4 h-4" />;
        if (score > previousScore) return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (score < previousScore) return <TrendingDown className="w-4 h-4 text-red-500" />;
        return <Minus className="w-4 h-4" />;
    };

    const getScoreColorClass = (color) => {
        switch (color) {
            case 'green': return 'text-green-600 border-green-200 bg-green-50';
            case 'blue': return 'text-blue-600 border-blue-200 bg-blue-50';
            case 'yellow': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
            case 'red': return 'text-red-600 border-red-200 bg-red-50';
            default: return 'text-gray-600 border-gray-200 bg-gray-50';
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                    Health Score - {name}
                </CardTitle>
                {email && <p className="text-xs text-gray-500">{email}</p>}
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold">{health_score}</span>
                        {getScoreIcon(health_score)}
                    </div>
                    <Badge className={getScoreColorClass(score_color)}>
                        {score_category}
                    </Badge>
                </div>

                {score_last_updated && (
                    <p className="text-xs text-gray-500 mt-2">
                        Last updated: {new Date(score_last_updated).toLocaleDateString()}
                    </p>
                )}

                {showActions && (
                    <div className="mt-4">
                        <button
                            onClick={() => onCalculateScore && onCalculateScore()}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Recalculate Score
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default HealthScoreCard;