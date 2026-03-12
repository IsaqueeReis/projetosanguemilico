import React, { useEffect, useState } from 'react';
import { globalRepo } from '../services/repository';
import { History } from 'lucide-react';

export const AdminLoginsPanel = () => {
    const [logins, setLogins] = useState<any[]>([]);

    useEffect(() => {
        const loadLogins = async () => {
            const data = await globalRepo.getLogins();
            setLogins(data);
        };
        loadLogins();
    }, []);

    return (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
            <h3 className="text-xl font-bold dark:text-white mb-6 flex items-center gap-2"><History className="text-blue-500"/> Controle de Logins</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-zinc-500 dark:text-zinc-400">
                    <thead className="text-xs text-zinc-700 uppercase bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400">
                        <tr>
                            <th className="px-6 py-3">Aluno</th>
                            <th className="px-6 py-3">E-mail</th>
                            <th className="px-6 py-3">IP</th>
                            <th className="px-6 py-3">Data/Hora</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logins.map((login: any) => (
                            <tr key={login.id} className="bg-white border-b dark:bg-zinc-900 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{login.users?.name || 'Desconhecido'}</td>
                                <td className="px-6 py-4">{login.users?.email || 'N/A'}</td>
                                <td className="px-6 py-4">{login.ip_address || 'N/A'}</td>
                                <td className="px-6 py-4">{new Date(login.login_time).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
