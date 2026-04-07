/**
 * Nom du module/fichier : moduleService.ts
 * 
 * Données en entrée : 
 *   - Les données d'un module (nom, date de fin, statut).
 *   - L'identifiant d'un module à modifier ou supprimer.
 * 
 * Données en sortie : 
 *   - Les objets "Module" mis à jour.
 *   - La liste des modules actifs ou archivés.
 * 
 * Objectif principal : Agir comme le "Pilote" de la gestion des parcours pédagogiques. Ce service contient la logique de haut niveau : il décide comment passer un module de l'état "Préparation" à "En cours", ou comment l'archiver. Il sert d'interface simplifiée pour que le reste de l'application puisse manipuler les modules sans se soucier de la complexité de la base de données.
 * 
 * Ce que ça affiche : Rien (c'est un service de coordination).
 */

import { IModuleRepository } from '../repositories/IModuleRepository';
import { SupabaseModuleRepository } from '../repositories/SupabaseModuleRepository';
import { ModuleWithRelations } from '../../../pages/Modules/utils/moduleHelpers';
import { Tables } from '../../../types/supabase';

export class ModuleService {
    constructor(private repository: IModuleRepository) { }

    /**
     * RÉCUPÉRATION GLOBALE :
     * Demande la liste de tous les modules avec leurs activités et matériels.
     */
    async getAllModules(): Promise<ModuleWithRelations[]> {
        return await this.repository.getAllModulesWithDetails();
    }

    /**
     * SUPPRESSION :
     * Demande l'effacement définitif d'un module.
     */
    async deleteModule(moduleId: string): Promise<void> {
        await this.repository.deleteModule(moduleId);
    }

    /**
     * CYCLE DE VIE (Bascule de statut) :
     * Cette fonction est le "levier de vitesse" des modules :
     * - Si le module est en PREPARATION -> il passe EN COURS.
     * - Si le module est EN COURS -> il passe en ARCHIVE (fini).
     * - Si le module est en ARCHIVE -> l'enseignant peut le remettre EN COURS.
     */
    async toggleModuleStatus(module: ModuleWithRelations): Promise<ModuleWithRelations> {
        const currentStatus = module.statut || 'en_preparation';
        let newStatus = 'en_cours';

        if (currentStatus === 'en_preparation') newStatus = 'en_cours';
        else if (currentStatus === 'en_cours') newStatus = 'archive';
        else if (currentStatus === 'archive') newStatus = 'en_cours';

        await this.repository.updateModuleStatus(module.id, newStatus);

        return { ...module, statut: newStatus };
    }

    /**
     * FILTRAGE :
     * Récupère uniquement les modules sur lesquels les élèves travaillent en ce moment.
     */
    async getActiveModules(): Promise<any[]> {
        return await this.repository.getActiveModules();
    }

    /**
     * RÉFÉRENTIELS :
     * Fournit la liste des matières (Maths, Français, etc.) disponibles pour classer les modules.
     */
    async getBranches(): Promise<Tables<'Branche'>[]> {
        return await this.repository.getBranches();
    }

    /**
     * LECTURE UNITAIRE :
     * Récupère le dossier complet d'un module spécifique.
     */
    async getModuleDetails(moduleId: string): Promise<ModuleWithRelations> {
        return await this.repository.getModuleWithDetails(moduleId);
    }

    /**
     * CRÉATION ET MISE À JOUR :
     * Transmet les ordres de création ou de modification au système de stockage.
     */
    async createModule(data: any): Promise<Tables<'Module'>> {
        return await this.repository.createModule(data);
    }

    async updateModule(id: string, data: any): Promise<void> {
        await this.repository.updateModule(id, data);
    }
}

// Création d'une instance du service prête à être utilisée par l'application
export const moduleService = new ModuleService(new SupabaseModuleRepository());
