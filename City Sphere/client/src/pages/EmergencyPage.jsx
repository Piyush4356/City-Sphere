import React from 'react';
import { Phone, Shield, Flame, Activity, HeartHandshake, Baby, Wifi, FileWarning, Search, AlertOctagon } from 'lucide-react';

export default function Emergency() {
    const primaryContacts = [
        { name: 'National Emergency', number: '112', desc: 'All-in-one emergency helpline', icon: <AlertOctagon className="w-8 h-8" />, color: 'bg-red-50 text-red-600 border-red-200' },
        { name: 'Police', number: '100', desc: 'Law enforcement & security', icon: <Shield className="w-8 h-8" />, color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
        { name: 'Fire Brigade', number: '101', desc: 'Fire & rescue emergencies', icon: <Flame className="w-8 h-8" />, color: 'bg-orange-50 text-orange-600 border-orange-200' },
        { name: 'Ambulance', number: '102', desc: 'Medical emergencies', icon: <Activity className="w-8 h-8" />, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' }
    ];

    const specificContacts = [
        { name: 'Disaster Management', number: '108', icon: <FileWarning className="w-5 h-5" /> },
        { name: 'Women Helpline', number: '1091', icon: <HeartHandshake className="w-5 h-5" /> },
        { name: 'Child Helpline', number: '1098', icon: <Baby className="w-5 h-5" /> },
        { name: 'Cyber Crime', number: '1930', icon: <Wifi className="w-5 h-5" /> },
        { name: 'Senior Citizen', number: '14567', icon: <HeartHandshake className="w-5 h-5" /> },
        { name: 'Missing Persons', number: '1094', icon: <Search className="w-5 h-5" /> },
    ];

    return (
        <div className="max-w-5xl mx-auto py-8">
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center bg-red-100 p-3 rounded-2xl mb-4 text-red-600 pulse-glow">
                    <Phone className="w-10 h-10 animate-pulse" />
                </div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Emergency Hub</h1>
                <p className="text-lg text-gray-500 font-medium">Quick access to life-saving services. Tap any number to call instantly.</p>
            </div>

            <div className="mb-12">
                <h2 className="text-xl font-bold text-gray-800 mb-6 uppercase tracking-wider flex items-center">
                    <span className="bg-gray-100 p-1.5 rounded-lg mr-3 text-red-500"><AlertOctagon className="w-5 h-5" /></span>
                    Primary Services
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {primaryContacts.map((contact, idx) => (
                        <div key={idx} className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative">
                            <div className={`p-6 border-b ${contact.color} transition-colors group-hover:bg-opacity-80 flex flex-col items-center justify-center text-center h-40`}>
                                <div className="mb-3 transform group-hover:scale-110 transition-transform">
                                    {contact.icon}
                                </div>
                                <h3 className="font-bold text-lg opacity-90">{contact.name}</h3>
                            </div>
                            <div className="p-6 text-center bg-white relative">
                                <p className="text-gray-500 text-sm font-medium mb-4 h-10">{contact.desc}</p>
                                <a 
                                    href={`tel:${contact.number}`}
                                    className="inline-flex items-center justify-center w-full bg-gray-900 hover:bg-black text-white text-2xl font-black py-4 rounded-xl transition-transform transform active:scale-95 border-2 border-transparent focus:outline-none focus:ring-4 focus:ring-red-500/20 shadow-md hover:shadow-lg"
                                >
                                    <Phone className="w-5 h-5 mr-3 opacity-75" />
                                    {contact.number}
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 mb-6 uppercase tracking-wider flex items-center">
                    <span className="bg-gray-100 p-1.5 rounded-lg mr-3 text-civic-400"><Phone className="w-5 h-5" /></span>
                    Specialized Helplines
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {specificContacts.map((contact, idx) => (
                        <a 
                            key={idx}
                            href={`tel:${contact.number}`}
                            className="flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-civic-200 hover:bg-civic-50 transition-all group"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="bg-gray-50 text-gray-500 p-2.5 rounded-xl group-hover:bg-white group-hover:text-civic-500 transition-colors shadow-sm">
                                    {contact.icon}
                                </div>
                                <span className="font-bold text-gray-700 group-hover:text-gray-900">{contact.name}</span>
                            </div>
                            <div className="flex items-center text-gray-400 group-hover:text-civic-500 transition-colors">
                                <span className="text-xl font-black mr-2">{contact.number}</span>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
            
            <div className="mt-8 text-center bg-yellow-50 text-yellow-800 p-4 rounded-2xl border border-yellow-100 inline-block w-full text-sm font-semibold flex items-center justify-center gap-3">
                <AlertOctagon className="w-5 h-5 text-yellow-500" />
                <span>False or prank calls to emergency lines are illegal and strictly punishable by law.</span>
            </div>
        </div>
    );
}
