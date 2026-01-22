export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            Activite: {
                Row: {
                    created_at: string
                    description: string | null
                    id: string
                    module_id: string | null
                    nombre_erreurs: number | null
                    nombre_exercices: number | null
                    ordre: number | null
                    photo_base64: string | null
                    statut_exigence: string | null
                    titre: string
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    created_at?: string
                    description?: string | null
                    id?: string
                    module_id?: string | null
                    nombre_erreurs?: number | null
                    nombre_exercices?: number | null
                    ordre?: number | null
                    photo_base64?: string | null
                    statut_exigence?: string | null
                    titre: string
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    created_at?: string
                    description?: string | null
                    id?: string
                    module_id?: string | null
                    nombre_erreurs?: number | null
                    nombre_exercices?: number | null
                    ordre?: number | null
                    photo_base64?: string | null
                    statut_exigence?: string | null
                    titre?: string
                    updated_at?: string | null
                    user_id?: string | null
                }
                Relationships: []
            }
            ActiviteMateriel: {
                Row: {
                    id: string
                    activite_id: string
                    type_materiel_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    activite_id: string
                    type_materiel_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    activite_id?: string
                    type_materiel_id?: string
                    created_at?: string
                }
                Relationships: []
            }
            ActiviteNiveau: {
                Row: {
                    activite_id: string
                    niveau_id: string
                    id: string
                    nombre_exercices: number | null
                    nombre_erreurs: number | null
                    statut_exigence: string | null
                }
                Insert: {
                    activite_id: string
                    niveau_id: string
                    id?: string
                    nombre_exercices?: number | null
                    nombre_erreurs?: number | null
                    statut_exigence?: string | null
                }
                Update: {
                    activite_id?: string
                    niveau_id?: string
                    id?: string
                    nombre_exercices?: number | null
                    nombre_erreurs?: number | null
                    statut_exigence?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "ActiviteNiveau_activite_id_fkey"
                        columns: ["activite_id"]
                        isOneToOne: false
                        referencedRelation: "Activite"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "ActiviteNiveau_niveau_id_fkey"
                        columns: ["niveau_id"]
                        isOneToOne: false
                        referencedRelation: "Niveau"
                        referencedColumns: ["id"]
                    }
                ]
            }
            Adulte: {
                Row: {
                    id: string
                    nom: string
                    prenom: string
                    email: string | null
                    user_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    nom: string
                    prenom: string
                    email?: string | null
                    user_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    nom?: string
                    prenom?: string
                    email?: string | null
                    user_id?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            Branche: {
                Row: {
                    couleur: string | null
                    created_at: string
                    id: string
                    nom: string
                    ordre: number | null
                    updated_at: string | null
                    user_id: string | null
                    photo_url: string | null
                }
                Insert: {
                    couleur?: string | null
                    created_at?: string
                    id?: string
                    nom: string
                    ordre?: number | null
                    updated_at?: string | null
                    user_id?: string | null
                    photo_url?: string | null
                }
                Update: {
                    couleur?: string | null
                    created_at?: string
                    id?: string
                    nom?: string
                    ordre?: number | null
                    updated_at?: string | null
                    user_id?: string | null
                    photo_url?: string | null
                }
                Relationships: []
            }
            Classe: {
                Row: {
                    acronyme: string | null
                    created_at: string
                    id: string
                    logo_url: string | null
                    nom: string
                    photo_base64: string | null
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    acronyme?: string | null
                    created_at?: string
                    id?: string
                    logo_url?: string | null
                    nom: string
                    photo_base64?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    acronyme?: string | null
                    created_at?: string
                    id?: string
                    nom?: string
                    photo_base64?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Relationships: []
            }
            ClasseAdulte: {
                Row: {
                    id: string
                    classe_id: string
                    adulte_id: string
                    role: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    classe_id: string
                    adulte_id: string
                    role?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    classe_id?: string
                    adulte_id?: string
                    role?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            Eleve: {
                Row: {
                    age: number | null
                    classe_id: string | null
                    created_at: string
                    date_naissance: string | null
                    groupe_id: string | null
                    id: string
                    nom: string
                    photo_base64: string | null
                    prenom: string
                    sex: string | null
                    updated_at: string | null
                    user_id: string | null
                    photo_url: string | null
                    photo_hash: string | null
                    parent1_nom: string | null
                    parent1_prenom: string | null
                    parent1_email: string | null
                    parent2_nom: string | null
                    parent2_prenom: string | null
                    parent2_email: string | null
                    niveau_id: string | null
                    nom_parents: string | null
                }
                Insert: {
                    age?: number | null
                    classe_id?: string | null
                    created_at?: string
                    date_naissance?: string | null
                    groupe_id?: string | null
                    id?: string
                    nom: string
                    photo_base64?: string | null
                    prenom: string
                    sex?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                    photo_url?: string | null
                    photo_hash?: string | null
                    parent1_nom?: string | null
                    parent1_prenom?: string | null
                    parent1_email?: string | null
                    parent2_nom?: string | null
                    parent2_prenom?: string | null
                    parent2_email?: string | null
                    niveau_id?: string | null
                    nom_parents?: string | null
                }
                Update: {
                    age?: number | null
                    classe_id?: string | null
                    created_at?: string
                    date_naissance?: string | null
                    groupe_id?: string | null
                    id?: string
                    nom?: string
                    photo_base64?: string | null
                    prenom?: string
                    sex?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                    photo_url?: string | null
                    photo_hash?: string | null
                    parent1_nom?: string | null
                    parent1_prenom?: string | null
                    parent1_email?: string | null
                    parent2_nom?: string | null
                    parent2_prenom?: string | null
                    parent2_email?: string | null
                    niveau_id?: string | null
                    nom_parents?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Eleve_classe_id_fkey"
                        columns: ["classe_id"]
                        isOneToOne: false
                        referencedRelation: "Classe"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Eleve_niveau_id_fkey"
                        columns: ["niveau_id"]
                        isOneToOne: false
                        referencedRelation: "Niveau"
                        referencedColumns: ["id"]
                    }
                ]
            }
            EleveGroupe: {
                Row: {
                    id: string
                    eleve_id: string
                    groupe_id: string
                    created_at: string
                    user_id: string | null
                }
                Insert: {
                    id?: string
                    eleve_id: string
                    groupe_id: string
                    created_at?: string
                    user_id?: string | null
                }
                Update: {
                    id?: string
                    eleve_id?: string
                    groupe_id?: string
                    created_at?: string
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "EleveGroupe_eleve_id_fkey"
                        columns: ["eleve_id"]
                        isOneToOne: false
                        referencedRelation: "Eleve"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "EleveGroupe_groupe_id_fkey"
                        columns: ["groupe_id"]
                        isOneToOne: false
                        referencedRelation: "Groupe"
                        referencedColumns: ["id"]
                    }
                ]
            }
            Groupe: {
                Row: {
                    created_at: string
                    id: string
                    nom: string
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    created_at?: string
                    id?: string
                    nom: string
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    created_at?: string
                    id?: string
                    nom?: string
                    updated_at?: string | null
                    user_id?: string | null
                }
                Relationships: []
            }
            Module: {
                Row: {
                    branche_id: string | null
                    created_at: string
                    date_fin: string | null
                    id: string
                    nom: string
                    ordre: number | null
                    statut: string | null
                    updated_at: string | null
                    user_id: string | null
                    sous_branche_id: string | null
                    titre: string | null
                    isActive: boolean | null
                }
                Insert: {
                    branche_id?: string | null
                    created_at?: string
                    date_fin?: string | null
                    id?: string
                    nom: string
                    ordre?: number | null
                    statut?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                    sous_branche_id?: string | null
                    titre?: string | null
                    isActive?: boolean | null
                }
                Update: {
                    branche_id?: string | null
                    created_at?: string
                    date_fin?: string | null
                    id?: string
                    nom?: string
                    ordre?: number | null
                    statut?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                    sous_branche_id?: string | null
                    titre?: string | null
                    isActive?: boolean | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Module_branche_id_fkey"
                        columns: ["branche_id"]
                        isOneToOne: false
                        referencedRelation: "Branche"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Module_sous_branche_id_fkey"
                        columns: ["sous_branche_id"]
                        isOneToOne: false
                        referencedRelation: "SousBranche"
                        referencedColumns: ["id"]
                    }
                ]
            }
            Niveau: {
                Row: {
                    id: string
                    nom: string
                    user_id: string | null
                    created_at: string
                    ordre: number | null
                }
                Insert: {
                    id?: string
                    nom: string
                    user_id?: string | null
                    created_at?: string
                    ordre?: number | null
                }
                Update: {
                    id?: string
                    nom?: string
                    user_id?: string | null
                    created_at?: string
                    ordre?: number | null
                }
                Relationships: []
            }
            Progression: {
                Row: {
                    activite_id: string
                    created_at: string
                    date_limite: string | null
                    eleve_id: string
                    etat: string
                    id: string
                    updated_at: string | null
                }
                Insert: {
                    activite_id: string
                    created_at?: string
                    date_limite?: string | null
                    eleve_id: string
                    etat: string
                    id?: string
                    updated_at?: string | null
                }
                Update: {
                    activite_id?: string
                    created_at?: string
                    date_limite?: string | null
                    eleve_id?: string
                    etat?: string
                    id?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Progression_eleve_id_fkey"
                        columns: ["eleve_id"]
                        isOneToOne: false
                        referencedRelation: "Eleve"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Progression_activite_id_fkey"
                        columns: ["activite_id"]
                        isOneToOne: false
                        referencedRelation: "Activite"
                        referencedColumns: ["id"]
                    }
                ]
            }
            SousBranche: {
                Row: {
                    branche_id: string | null
                    created_at: string
                    id: string
                    nom: string
                    ordre: number | null
                    photo_base64: string | null
                    photo_url: string | null
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    branche_id?: string | null
                    created_at?: string
                    id?: string
                    nom: string
                    ordre?: number | null
                    photo_base64?: string | null
                    photo_url?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    branche_id?: string | null
                    created_at?: string
                    id?: string
                    nom?: string
                    ordre?: number | null
                    photo_base64?: string | null
                    photo_url?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Relationships: []
            }
            TypeMateriel: {
                Row: {
                    id: string
                    nom: string
                    created_at: string
                    user_id: string | null
                }
                Insert: {
                    id?: string
                    nom: string
                    created_at?: string
                    user_id?: string | null
                }
                Update: {
                    id?: string
                    nom?: string
                    created_at?: string
                    user_id?: string | null
                }
                Relationships: []
            }
            SetupPresence: {
                Row: {
                    id: string
                    nom: string
                    description: string | null
                    user_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    nom: string
                    description?: string | null
                    user_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    nom?: string
                    description?: string | null
                    user_id?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            CategoriePresence: {
                Row: {
                    id: string
                    setup_id: string
                    nom: string
                    couleur: string | null
                    user_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    setup_id: string
                    nom: string
                    couleur?: string | null
                    user_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    setup_id?: string
                    nom?: string
                    couleur?: string | null
                    user_id?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            Attendance: {
                Row: {
                    id: string
                    date: string
                    setup_id: string
                    periode: string
                    eleve_id: string
                    categorie_id: string | null
                    status: string | null
                    user_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    date: string
                    setup_id: string
                    periode: string
                    eleve_id: string
                    categorie_id?: string | null
                    status?: string | null
                    user_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    date?: string
                    setup_id?: string
                    periode?: string
                    eleve_id?: string
                    categorie_id?: string | null
                    status?: string | null
                    user_id?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            UserPreference: {
                Row: {
                    id: string
                    user_id: string
                    key: string
                    value: any
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    key: string
                    value: any
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    key?: string
                    value?: any
                    updated_at?: string
                }
                Relationships: []
            }
            CompteUtilisateur: {
                Row: {
                    id: string
                    email: string | null
                    nom: string | null
                    prenom: string | null
                    last_selected_group_id: string | null
                    created_at: string
                    updated_at: string | null
                }
                Insert: {
                    id: string
                    email?: string | null
                    nom?: string | null
                    prenom?: string | null
                    last_selected_group_id?: string | null
                    created_at?: string
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    email?: string | null
                    nom?: string | null
                    prenom?: string | null
                    last_selected_group_id?: string | null
                    created_at?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            weekly_planning: {
                Row: {
                    id: string
                    user_id: string
                    week_start_date: string
                    day_of_week: string
                    activity_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    week_start_date: string
                    day_of_week: string
                    activity_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    week_start_date?: string
                    day_of_week?: string
                    activity_id?: string
                    created_at?: string
                }
                Relationships: []
            }
        }
        Views: {
            view_retards_count: {
                Row: {
                    eleve_id: string
                    nombre_retards: number
                }
                Relationships: []
            }
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}

export type Tables<
    T extends keyof Database['public']['Tables']
> = Database['public']['Tables'][T]['Row']

export type TablesInsert<
    T extends keyof Database['public']['Tables']
> = Database['public']['Tables'][T]['Insert']

export type TablesUpdate<
    T extends keyof Database['public']['Tables']
> = Database['public']['Tables'][T]['Update']

export type Enums<
    T extends keyof Database['public']['Enums']
> = Database['public']['Enums'][T]
