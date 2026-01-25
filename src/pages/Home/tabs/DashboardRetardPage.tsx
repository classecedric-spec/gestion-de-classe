import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import DashboardLateWorks from '../../../features/dashboard/components/DashboardLateWorks';
import { DashboardContextType } from '../DashboardContext';
import { Student } from '../../../features/attendance/services/attendanceService';

const DashboardRetardPage: React.FC = () => {
    const navigate = useNavigate();
    const { dashboardData } = useOutletContext<DashboardContextType>();

    const handleStudentClick = (student: Student, tab = 'suivi') => {
        navigate('/dashboard/user/students', {
            state: {
                selectedStudentId: student.id,
                initialTab: tab
            }
        });
    };

    return (
        <DashboardLateWorks
            overdueStudents={dashboardData.overdueStudents}
            onStudentClick={(student) => handleStudentClick(student, 'urgent')}
        />
    );
};

export default DashboardRetardPage;
