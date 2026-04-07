/**
 * Nom du module/fichier : WeeklyPlannerPDF.tsx
 * 
 * Données en entrée : 
 *   - `schedule` : Liste des cours et activités planifiés pour la semaine.
 *   - `modules` : Détails des modules (branches, sous-branches) pour enrichir l'affichage.
 *   - `weekLabel` : Le titre de la semaine (ex: "Semaine du 25 au 29 Octobre").
 * 
 * Données en sortie : 
 *   - Génération d'un document PDF structuré et stylisé.
 * 
 * Objectif principal : Transformer la grille interactive du web en un document "papier" propre que l'enseignant peut imprimer et poser sur son bureau. Le PDF doit refléter fidèlement le planning, y compris les durées prolongées et les créneaux partagés.
 * 
 * Ce que ça gère : 
 *   - La mise en page format paysage (A4).
 *   - Le rendu des couleurs (codes hexadécimaux).
 *   - Les différents modes d'affichage : Mono-activité (pleine case), Duo (moitié/moitié) ou Quadrants (4 activités).
 *   - L'affichage des "OFF" (mercredi après-midi).
 */

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { WeeklyPlanningItem, ModuleWithDetails } from './WeeklyPlannerModal/useWeeklyPlanner';


// Configuration des styles PDF (équivalent du CSS pour l'impression)
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        padding: 20,
    },
    header: {
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#aaa',
        paddingBottom: 5,
    },
    title: {
        fontSize: 18,
        textAlign: 'center',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 10,
        textAlign: 'center',
        color: '#666',
        marginTop: 2,
    },
    grid: {
        flexDirection: 'row',
        flexGrow: 1,
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#000',
        borderLeftWidth: 1,
        borderLeftColor: '#000',
    },
    column: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: '#000',
        flexDirection: 'column',
    },
    periodColumn: {
        width: 30,
        borderRightWidth: 1,
        borderRightColor: '#000',
        flexDirection: 'column',
    },
    colHeader: {
        padding: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        backgroundColor: '#f0f0f0',
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colHeaderText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    // Styles pour les cases (Slots)
    slot: {
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        padding: 6,
        minHeight: 60,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
    },
    periodLabelSlot: {
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        minHeight: 60,
    },
    periodText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Styles pour les étiquettes de cours
    itemCard: {
        backgroundColor: '#e6f0ff',
        borderRadius: 4,
        padding: 4,
        marginBottom: 2,
        borderLeftWidth: 3,
        borderLeftColor: '#2563eb', // Bleu primaire
    },
    itemTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    itemMeta: {
        fontSize: 7,
        color: '#444',
        marginLeft: 8,
        marginBottom: 1,
        fontStyle: 'italic',
        marginTop: 1,
    },
    levelBadge: {
        fontSize: 6,
        backgroundColor: '#f5f5f5',
        padding: 1,
        borderRadius: 2,
        marginTop: 1,
        marginLeft: 4,
        color: '#888',
        borderWidth: 0.5,
        borderColor: '#ddd',
    },
});

// FONCTION UTILITAIRE : Récupère les cours d'une journée donnée.
const getItemsForDay = (dayName: string, schedule: WeeklyPlanningItem[]) => {
    return schedule.filter(item => item.day_of_week === dayName).sort((a, b) => a.period_index - b.period_index);
};

// FONCTION UTILITAIRE : Enrichit l'étiquette avec la branche et le niveau depuis la base de données.
const getModuleDetails = (activityTitle: string, modules: ModuleWithDetails[]) => {
    const module = modules.find(m => m.nom === activityTitle);
    if (!module) return null;

    // Branches
    const subBranch = module.SousBranche?.nom;
    const branch = module.SousBranche?.Branche?.nom;

    // Niveaux concernés (ex: CE1, CE2)
    const levels = new Set<string>();
    if (module.Activite) {
        module.Activite.forEach(act => {
            if (act.ActiviteNiveau) {
                act.ActiviteNiveau.forEach(an => {
                    if (an.Niveau?.nom) levels.add(an.Niveau.nom);
                });
            }
        });
    }

    return {
        branch,
        subBranch,
        levels: Array.from(levels).sort()
    };
};

interface WeeklyPlannerPDFProps {
    schedule: WeeklyPlanningItem[];
    modules: ModuleWithDetails[];
    weekLabel: string;
    weekStartDate?: string;
}

/**
 * COMPOSANT : Le document PDF à exporter.
 */
export const WeeklyPlannerPDF: React.FC<WeeklyPlannerPDFProps> = ({ schedule, modules, weekLabel }) => {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const periods = [1, 2, 3, 4, 5, 6]; // 6 périodes standard

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                {/* EN-TÊTE DU DOCUMENT */}
                <View style={styles.header}>
                    <Text style={styles.title}>Planning - {weekLabel}</Text>
                </View>

                {/* GRILLE PRINCIPALE */}
                <View style={styles.grid}>
                    {/* Colonne des numéros d'heures (1 à 6) */}
                    <View style={styles.periodColumn}>
                        <View style={styles.colHeader}>
                            <Text style={styles.colHeaderText}>#</Text>
                        </View>
                        {periods.map(p => (
                            <View key={p} style={[styles.periodLabelSlot, { flex: 1 }]}>
                                <Text style={styles.periodText}>{p}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Colonnes des jours de la semaine */}
                    {days.map((day) => {
                        const dayItems = getItemsForDay(day, schedule);

                        return (
                            <View key={day} style={styles.column}>
                                <View style={styles.colHeader}>
                                    <Text style={styles.colHeaderText}>{day}</Text>
                                </View>
                                
                                {/* Tracé des cases du jour */}
                                <View style={{ flex: 1 }}>
                                    {(() => {
                                        const rendered = [];

                                        // On boucle sur chaque créneau horaire
                                        for (let p = 1; p <= 6; p++) {
                                            const isWednesdayAfternoon = day === 'Mercredi' && p >= 5;

                                            // Récupération des activités commençant à cette heure (max 4 gérées ici)
                                            const itemsStartingHere = dayItems.filter(it => it.period_index === p)
                                                .slice(0, 4);

                                            // Vérifie si un cours de la période précédente déborde encore ici
                                            const isCovered = dayItems.some(it => it.period_index < p && (it.period_index + (it.duration || 1)) > p);

                                            // calcul du style visuel (fond et bordures)
                                            let backgroundColor = '#fff';
                                            let borderBottomColor = '#ddd';
                                            let borderColor = '#ddd';
                                            let borderWidth = 0.5;

                                            const itemCount = itemsStartingHere.length;
                                            const isMulti = itemCount > 1;

                                            if (itemCount === 1) {
                                                // Gestion de la couleur personnalisée
                                                if (itemsStartingHere[0].color_code?.startsWith?.('#')) {
                                                    backgroundColor = itemsStartingHere[0].color_code;
                                                } else {
                                                    backgroundColor = '#e6f0ff';
                                                }

                                                // Si le cours continue au créneau suivant, on cache la bordure du bas
                                                const item = itemsStartingHere[0];
                                                const lastPeriodIndex = item.period_index + (item.duration || 1) - 1;
                                                if (p < lastPeriodIndex) borderBottomColor = backgroundColor;
                                            } else if (isCovered) {
                                                // On applique la couleur de l'élément qui déborde
                                                const coveringItem = dayItems.find(it => it.period_index < p && (it.period_index + (it.duration || 1)) > p);

                                                if (coveringItem?.color_code?.startsWith?.('#')) {
                                                    backgroundColor = coveringItem.color_code;
                                                } else {
                                                    backgroundColor = '#e6f0ff';
                                                }

                                                const lastPeriodIndex = coveringItem!.period_index + (coveringItem!.duration || 1) - 1;
                                                if (p < lastPeriodIndex) borderBottomColor = backgroundColor;
                                            } else if (isWednesdayAfternoon) {
                                                backgroundColor = '#333';
                                                borderBottomColor = '#444';
                                            }

                                            /**
                                             * Rendu interne de la cellule selon le nombre d'activités.
                                             */
                                            const renderContent = () => {
                                                if (itemCount === 0) {
                                                    if (isWednesdayAfternoon && !isCovered) {
                                                        return (
                                                            <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                                                                <Text style={{ fontSize: 8, color: '#666', textTransform: 'uppercase' }}>OFF</Text>
                                                            </View>
                                                        );
                                                    }
                                                    return null;
                                                }

                                                // Sous-fonction pour dessiner une petite étiquette
                                                const renderItemCard = (item: WeeklyPlanningItem, styleExtras = {}) => {
                                                    const moduleDetails = getModuleDetails(item.activity_title, modules);
                                                    return (
                                                        <View style={{
                                                            padding: 2,
                                                            backgroundColor: item.color_code?.startsWith?.('#') ? item.color_code : '#e6f0ff',
                                                            ...styleExtras
                                                        }}>
                                                            <Text style={[styles.itemTitle, { fontSize: isMulti ? 7 : 9 }]}>{item.activity_title}</Text>
                                                            {moduleDetails && (
                                                                <>
                                                                    {moduleDetails.branch && (
                                                                        <Text style={[styles.itemMeta, { fontSize: isMulti ? 6 : 7 }]}>
                                                                            {moduleDetails.branch} {(!isMulti && moduleDetails.subBranch) ? `> ${moduleDetails.subBranch}` : ''}
                                                                        </Text>
                                                                    )}
                                                                </>
                                                            )}
                                                        </View>
                                                    );
                                                };

                                                // CAS : 1 seule activité
                                                if (itemCount === 1) {
                                                    return renderItemCard(itemsStartingHere[0], { flex: 1, backgroundColor: 'transparent' });
                                                }

                                                // CAS : 2 activités (partage vertical)
                                                if (itemCount === 2) {
                                                    return (
                                                        <View style={{ flex: 1, flexDirection: 'column' }}>
                                                            {renderItemCard(itemsStartingHere[0], { flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#fff', marginBottom: 1 })}
                                                            {renderItemCard(itemsStartingHere[1], { flex: 1 })}
                                                        </View>
                                                    );
                                                }

                                                // CAS : 3 ou 4 activités (partage en 4 quadrants)
                                                return (
                                                    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
                                                        {itemsStartingHere.map((item, idx) => (
                                                            <View key={idx} style={{
                                                                width: '50%',
                                                                height: '50%',
                                                                borderRightWidth: (idx % 2 === 0) ? 0.5 : 0,
                                                                borderBottomWidth: (idx < 2) ? 0.5 : 0,
                                                                borderColor: '#fff',
                                                                padding: 1
                                                            }}>
                                                                {renderItemCard(item, { flex: 1, borderRadius: 2 })}
                                                            </View>
                                                        ))}
                                                    </View>
                                                );
                                            };

                                            rendered.push(
                                                <View key={p} style={[
                                                    styles.slot,
                                                    {
                                                        flex: 1,
                                                        backgroundColor: backgroundColor,
                                                        borderBottomColor: borderBottomColor,
                                                        borderColor: borderColor,
                                                        borderWidth: borderWidth,
                                                        padding: isMulti ? 1 : 2,
                                                        overflow: 'hidden'
                                                    }
                                                ]}>
                                                    {renderContent()}
                                                </View>
                                            );
                                        }
                                        return rendered;
                                    })()}
                                </View>
                            </View>
                        );
                    })}
                </View>
                <Text style={{ fontSize: 8, textAlign: 'center', marginTop: 5, color: '#999' }}>Généré par Gestion de Classe</Text>
            </Page>
        </Document>
    );
};

/**
 * LOGIGRAMME D'EXPORT PDF :
 * 
 * 1. PRÉPARATION -> Le composant reçoit la liste finale des créneaux planifiés de la part du semainier interactif.
 * 2. STRUCTURE -> Il crée une Page A4 paysage avec une table de 6 colonnes (1 pour les heures + 5 pour les jours).
 * 3. REMPLISSAGE -> Pour chaque jour et chaque heure, il vérifie s'il y a un ou plusieurs cours.
 * 4. DESSIN -> Si 1 cours : il remplit la case. Si multiple : il divise la case en 2 ou 4 compartiments.
 * 5. DURÉE -> Si un cours dure 2h, il colorie aussi la case suivante et retire la bordure intermédiaire.
 */
