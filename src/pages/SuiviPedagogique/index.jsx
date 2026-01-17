import React from 'react';
import TrackingDashboard from '../../features/tracking/components/TrackingDashboard';

/**
 * Page component for Pedagogical Tracking (Suivi)
 * Logic and UI delegates to TrackingDashboard feature
 */
const SuiviPedagogique = (props) => {
    return <TrackingDashboard {...props} />;
};

export default SuiviPedagogique;
