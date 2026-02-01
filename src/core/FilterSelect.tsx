import React from 'react';
import Select, { SelectProps } from './Select';

/**
 * FilterSelect - Select spécialisé pour les filtres
 * Force le style inset, pleine largeur et l'icône en couleur primaire.
 */
export const FilterSelect: React.FC<SelectProps> = (props) => {
    return (
        <Select
            variant="inset"
            fullWidth
            iconClassName="text-primary"
            {...props}
        />
    );
};
