import React from 'react';
import { MapPin, Clock, Phone, AlertCircle } from 'lucide-react';

const ServiceCard = ({ service }) => {
    const getIcon = (type) => {
        switch (type) {
            case 'Waste': return <Clock className="w-6 h-6 text-green-500" />;
            case 'Water': return <AlertCircle className="w-6 h-6 text-civic-400" />;
            case 'Transport': return <MapPin className="w-6 h-6 text-orange-500" />;
            case 'Emergency': return <Phone className="w-6 h-6 text-red-500" />;
            default: return <MapPin className="w-6 h-6 text-gray-500" />;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                        {getIcon(service.type)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-gray-800">{service.name}</h3>
                        <span className="text-sm text-gray-500 font-medium px-2 py-0.5 rounded-full bg-gray-100">
                            {service.type}
                        </span>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${service.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {service.status}
                </span>
            </div>

            <p className="mt-4 text-gray-600 text-sm leading-relaxed">
                {service.description || 'No description available for this service.'}
            </p>

            <div className="mt-6 space-y-2">
                {service.location && service.location.address && (
                    <div className="flex items-center text-gray-500 text-sm">
                        <MapPin className="w-4 h-4 mr-2" />
                        {service.location.address}
                    </div>
                )}
                {service.schedule && (
                    <div className="flex items-center text-gray-500 text-sm">
                        <Clock className="w-4 h-4 mr-2" />
                        {service.schedule}
                    </div>
                )}
                {service.contact && (
                    <div className="flex items-center text-gray-500 text-sm">
                        <Phone className="w-4 h-4 mr-2" />
                        {service.contact}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServiceCard;
