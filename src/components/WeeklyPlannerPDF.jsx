import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// Create styles
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
    // Slots
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
    // Item Card
    itemCard: {
        backgroundColor: '#e6f0ff',
        borderRadius: 4,
        padding: 4,
        marginBottom: 2,
        borderLeftWidth: 3,
        borderLeftColor: '#2563eb', // Primary Blue
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

// Helper to filter items by day
const getItemsForDay = (dayName, schedule) => {
    return schedule.filter(item => item.day_of_week === dayName).sort((a, b) => a.period_index - b.period_index);
};

// Helper to resolve module details
const getModuleDetails = (activityTitle, modules) => {
    const module = modules.find(m => m.nom === activityTitle);
    if (!module) return null;

    // Branch / SubBranch
    const subBranch = module.SousBranche?.nom;
    const branch = module.SousBranche?.Branche?.nom;

    // Levels (Levels with requirements)
    const levels = new Set();
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


export const WeeklyPlannerPDF = ({ schedule, modules, weekLabel, weekStartDate }) => {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const periods = [1, 2, 3, 4, 5, 6]; // 6 Periods

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>Planning - {weekLabel}</Text>
                </View>

                <View style={styles.grid}>
                    {/* Period Labels Column */}
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

                    {/* Day Columns */}
                    {days.map((day, dIndex) => {
                        const dayItems = getItemsForDay(day, schedule);

                        // Create a map of period -> item
                        // Handling rowSpan naturally in print is hard without precise absolute positioning.
                        // Simple approach: Render 6 slots. If a slot is occupied, render item. 
                        // If item has duration > 1, render it in the first slot with height * duration, and SKIP subsequent slots?
                        // Flexbox approach: Render slots with flex: item.duration.
                        // But we need alignment across columns.
                        // Best approach: Fixed height slots. "flex: 1" for each period.
                        // Items fill the slots.

                        const slots = [];
                        for (let i = 0; i < 6; i++) {
                            // Check if an item starts here
                            const item = dayItems.find(it => it.period_index === i);
                            if (item) {
                                slots.push({ ...item, type: 'item' });
                                // Skip next slots if duration > 1
                                // But for simplicity, let's assume UI handles conflicts. 
                                // Note: In PDF loop we must skip indices.
                            } else {
                                // Check if this slot is covered by a previous item? 
                                // The `dayItems` only keys start period.
                                // But we need to know if it's covered.
                                const coveringItem = dayItems.find(it => it.period_index < i && (it.period_index + (it.duration || 1)) > i);
                                if (!coveringItem) {
                                    slots.push({ type: 'empty', period_index: i });
                                }
                            }
                        }

                        return (
                            <View key={day} style={styles.column}>
                                <View style={styles.colHeader}>
                                    <Text style={styles.colHeaderText}>{day}</Text>
                                </View>
                                {/* Slots */}
                                {/* We iterate 0..5 but need to handle skips or sizing */}
                                {/* Actually, easier: just map logical slots. */}
                                {/* Render a container that fills the height (flex: 1) */}
                                <View style={{ flex: 1 }}>
                                    {(() => {
                                        const rendered = [];

                                        // FIXED LOOP: Iterate 1 to 6 to ensure every column has exactly 6 slots/borders
                                        for (let p = 1; p <= 6; p++) {
                                            const isWednesdayAfternoon = day === 'Mercredi' && p >= 5;

                                            // Find ALL items starting at this period
                                            const itemsStartingHere = dayItems.filter(it => it.period_index === p)
                                                // Handle up to 4 items (slice just in case, though UI limits it)
                                                .slice(0, 4);

                                            const isCovered = dayItems.some(it => it.period_index < p && (it.period_index + (it.duration || 1)) > p);

                                            // Base Cell Style
                                            let backgroundColor = '#fff';
                                            let borderBottomColor = '#ddd';
                                            let borderColor = '#ddd';
                                            let borderWidth = 0.5;

                                            // Determine layout mode
                                            const itemCount = itemsStartingHere.length;
                                            const isMulti = itemCount > 1;

                                            // No extra border for multi items as requested (sub-cells are enough)
                                            if (itemCount === 1) {
                                                backgroundColor = itemsStartingHere[0].color || '#e6f0ff';
                                                // Border logic for single item continuation
                                                const item = itemsStartingHere[0];
                                                const lastPeriodIndex = item.period_index + (item.duration || 1) - 1;
                                                if (p < lastPeriodIndex) borderBottomColor = backgroundColor;
                                            } else if (isCovered) {
                                                const coveringItem = dayItems.find(it => it.period_index < p && (it.period_index + (it.duration || 1)) > p);
                                                backgroundColor = coveringItem?.color || '#e6f0ff';
                                                const lastPeriodIndex = coveringItem.period_index + (coveringItem.duration || 1) - 1;
                                                if (p < lastPeriodIndex) borderBottomColor = backgroundColor;
                                            } else if (isWednesdayAfternoon) {
                                                backgroundColor = '#333';
                                                borderBottomColor = '#444';
                                            }

                                            // Render Content based on Count
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

                                                // Helper to render a single mini-card
                                                const renderItemCard = (item, styleExtras = {}) => {
                                                    const moduleDetails = getModuleDetails(item.activity_title, modules);
                                                    return (
                                                        <View style={{
                                                            padding: 2,
                                                            backgroundColor: item.color || '#e6f0ff',
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

                                                if (itemCount === 1) {
                                                    // Standard Full Cell
                                                    return renderItemCard(itemsStartingHere[0], { flex: 1, backgroundColor: 'transparent' }); // bg handled by container
                                                }

                                                if (itemCount === 2) {
                                                    // Split Vertically (2 Rows)
                                                    return (
                                                        <View style={{ flex: 1, flexDirection: 'column' }}>
                                                            {renderItemCard(itemsStartingHere[0], { flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#fff', marginBottom: 1 })}
                                                            {renderItemCard(itemsStartingHere[1], { flex: 1 })}
                                                        </View>
                                                    );
                                                }

                                                // 3 or 4 Items: Quadrants (2x2)
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
