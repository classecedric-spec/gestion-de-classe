import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PortraitLayout from './layouts/PortraitLayout';
import StudentSelection from './screens/StudentSelection';
import StudentDashboard from './screens/StudentDashboard';
import StudentPlanning from './screens/StudentPlanning';
import { useKioskAutoClose } from '../../hooks/useKioskAutoClose';
import KioskClosedScreen from '../../components/KioskClosedScreen';

const StudentKiosk: React.FC = () => {
    const { isClosed, timeNow } = useKioskAutoClose({ closeHour: 16 });

    return (
        <PortraitLayout>
            {/* Fermeture automatique à 16h (heure de Bruxelles) */}
            {isClosed && <KioskClosedScreen timeNow={timeNow} />}

            <Routes>
                <Route index element={<StudentSelection />} />
                <Route path=":studentId" element={<StudentDashboard />} />
                <Route path="planning/:studentId" element={<StudentPlanning />} />
            </Routes>
        </PortraitLayout>
    );
};

export default StudentKiosk;
