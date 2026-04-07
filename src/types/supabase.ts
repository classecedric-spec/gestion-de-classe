export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
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
          photo_url: string | null
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
          photo_url?: string | null
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
          photo_url?: string | null
          statut_exigence?: string | null
          titre?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Activite_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "Module"
            referencedColumns: ["id"]
          },
        ]
      }
      ActiviteMateriel: {
        Row: {
          activite_id: string
          type_materiel_id: string
        }
        Insert: {
          activite_id: string
          type_materiel_id: string
        }
        Update: {
          activite_id?: string
          type_materiel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ActiviteMateriel_activite_id_fkey"
            columns: ["activite_id"]
            isOneToOne: false
            referencedRelation: "Activite"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ActiviteMateriel_type_materiel_id_fkey"
            columns: ["type_materiel_id"]
            isOneToOne: false
            referencedRelation: "TypeMateriel"
            referencedColumns: ["id"]
          },
        ]
      }
      ActiviteNiveau: {
        Row: {
          activite_id: string
          created_at: string
          id: string
          niveau_id: string
          nombre_erreurs: number | null
          nombre_exercices: number | null
          statut_exigence: string | null
          user_id: string | null
        }
        Insert: {
          activite_id: string
          created_at?: string
          id?: string
          niveau_id: string
          nombre_erreurs?: number | null
          nombre_exercices?: number | null
          statut_exigence?: string | null
          user_id?: string | null
        }
        Update: {
          activite_id?: string
          created_at?: string
          id?: string
          niveau_id?: string
          nombre_erreurs?: number | null
          nombre_exercices?: number | null
          statut_exigence?: string | null
          user_id?: string | null
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
          },
        ]
      }
      Adulte: {
        Row: {
          created_at: string | null
          fonction: string | null
          id: string
          nom: string
          prenom: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          fonction?: string | null
          id?: string
          nom: string
          prenom: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          fonction?: string | null
          id?: string
          nom?: string
          prenom?: string
          user_id?: string | null
        }
        Relationships: []
      }
      Attendance: {
        Row: {
          categorie_id: string | null
          created_at: string
          date: string
          eleve_id: string | null
          id: string
          periode: string | null
          setup_id: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          categorie_id?: string | null
          created_at?: string
          date?: string
          eleve_id?: string | null
          id?: string
          periode?: string | null
          setup_id?: string | null
          status: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          categorie_id?: string | null
          created_at?: string
          date?: string
          eleve_id?: string | null
          id?: string
          periode?: string | null
          setup_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Attendance_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "CategoriePresence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Attendance_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "Eleve"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Attendance_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "SetupPresence"
            referencedColumns: ["id"]
          },
        ]
      }
      Branche: {
        Row: {
          couleur: string | null
          created_at: string
          id: string
          nom: string
          ordre: number | null
          photo_url: string | null
          sous_domaine_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          couleur?: string | null
          created_at?: string
          id?: string
          nom: string
          ordre?: number | null
          photo_url?: string | null
          sous_domaine_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          couleur?: string | null
          created_at?: string
          id?: string
          nom?: string
          ordre?: number | null
          photo_url?: string | null
          sous_domaine_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Branche_sous_domaine_id_fkey"
            columns: ["sous_domaine_id"]
            isOneToOne: false
            referencedRelation: "SousDomaine"
            referencedColumns: ["id"]
          },
        ]
      }
      CategoriePresence: {
        Row: {
          couleur: string | null
          created_at: string
          id: string
          nom: string
          setup_id: string | null
          user_id: string | null
        }
        Insert: {
          couleur?: string | null
          created_at?: string
          id?: string
          nom: string
          setup_id?: string | null
          user_id?: string | null
        }
        Update: {
          couleur?: string | null
          created_at?: string
          id?: string
          nom?: string
          setup_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CategoriePresence_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "SetupPresence"
            referencedColumns: ["id"]
          },
        ]
      }
      Classe: {
        Row: {
          acronyme: string | null
          created_at: string
          id: string
          logo_url: string | null
          nom: string
          titulaire_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          acronyme?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          nom: string
          titulaire_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          acronyme?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          nom?: string
          titulaire_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Classe_titulaire_id_fkey"
            columns: ["titulaire_id"]
            isOneToOne: false
            referencedRelation: "Adulte"
            referencedColumns: ["id"]
          },
        ]
      }
      ClasseAdulte: {
        Row: {
          adulte_id: string | null
          classe_id: string | null
          created_at: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          adulte_id?: string | null
          classe_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          adulte_id?: string | null
          classe_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ClasseAdulte_adulte_id_fkey"
            columns: ["adulte_id"]
            isOneToOne: false
            referencedRelation: "Adulte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ClasseAdulte_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "Classe"
            referencedColumns: ["id"]
          },
        ]
      }
      CompteUtilisateur: {
        Row: {
          created_at: string
          email: string | null
          id: string
          kiosk_is_open: boolean | null
          kiosk_planning_open: boolean | null
          last_selected_group_id: string | null
          nom: string | null
          nom_ecole: string | null
          photo_base64: string | null
          photo_hash: string | null
          photo_url: string | null
          prenom: string | null
          updated_at: string | null
          validation_admin: boolean | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          kiosk_is_open?: boolean | null
          kiosk_planning_open?: boolean | null
          last_selected_group_id?: string | null
          nom?: string | null
          nom_ecole?: string | null
          photo_base64?: string | null
          photo_hash?: string | null
          photo_url?: string | null
          prenom?: string | null
          updated_at?: string | null
          validation_admin?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          kiosk_is_open?: boolean | null
          kiosk_planning_open?: boolean | null
          last_selected_group_id?: string | null
          nom?: string | null
          nom_ecole?: string | null
          photo_base64?: string | null
          photo_hash?: string | null
          photo_url?: string | null
          prenom?: string | null
          updated_at?: string | null
          validation_admin?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "CompteUtilisateur_last_selected_group_id_fkey"
            columns: ["last_selected_group_id"]
            isOneToOne: false
            referencedRelation: "Groupe"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_activities: {
        Row: {
          created_at: string
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      Devoirs: {
        Row: {
          created_at: string | null
          date: string
          eleve_id: string | null
          id: string
          statut: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          eleve_id?: string | null
          id?: string
          statut: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          eleve_id?: string | null
          id?: string
          statut?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Devoirs_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "Eleve"
            referencedColumns: ["id"]
          },
        ]
      }
      Eleve: {
        Row: {
          access_token: string | null
          annee_inscription: number | null
          classe_id: string | null
          created_at: string
          date_naissance: string | null
          groupe_id: string | null
          id: string
          importance_suivi: number | null
          niveau_id: string | null
          nom: string
          nom_parents: string | null
          parent1_email: string | null
          parent1_nom: string | null
          parent1_prenom: string | null
          parent1_telephone: string | null
          parent2_email: string | null
          parent2_nom: string | null
          parent2_prenom: string | null
          parent2_telephone: string | null
          photo_hash: string | null
          photo_url: string | null
          prenom: string
          sex: string | null
          titulaire_id: string | null
          trust_trend: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          annee_inscription?: number | null
          classe_id?: string | null
          created_at?: string
          date_naissance?: string | null
          groupe_id?: string | null
          id?: string
          importance_suivi?: number | null
          niveau_id?: string | null
          nom: string
          nom_parents?: string | null
          parent1_email?: string | null
          parent1_nom?: string | null
          parent1_prenom?: string | null
          parent1_telephone?: string | null
          parent2_email?: string | null
          parent2_nom?: string | null
          parent2_prenom?: string | null
          parent2_telephone?: string | null
          photo_hash?: string | null
          photo_url?: string | null
          prenom: string
          sex?: string | null
          titulaire_id?: string | null
          trust_trend?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          annee_inscription?: number | null
          classe_id?: string | null
          created_at?: string
          date_naissance?: string | null
          groupe_id?: string | null
          id?: string
          importance_suivi?: number | null
          niveau_id?: string | null
          nom?: string
          nom_parents?: string | null
          parent1_email?: string | null
          parent1_nom?: string | null
          parent1_prenom?: string | null
          parent1_telephone?: string | null
          parent2_email?: string | null
          parent2_nom?: string | null
          parent2_prenom?: string | null
          parent2_telephone?: string | null
          photo_hash?: string | null
          photo_url?: string | null
          prenom?: string
          sex?: string | null
          titulaire_id?: string | null
          trust_trend?: string | null
          updated_at?: string | null
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
            foreignKeyName: "Eleve_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "Groupe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Eleve_niveau_id_fkey"
            columns: ["niveau_id"]
            isOneToOne: false
            referencedRelation: "Niveau"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Eleve_titulaire_id_fkey"
            columns: ["titulaire_id"]
            isOneToOne: false
            referencedRelation: "CompteUtilisateur"
            referencedColumns: ["id"]
          },
        ]
      }
      EleveGroupe: {
        Row: {
          created_at: string | null
          eleve_id: string | null
          groupe_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          eleve_id?: string | null
          groupe_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          eleve_id?: string | null
          groupe_id?: string | null
          id?: string
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
          },
        ]
      }
      Evaluation: {
        Row: {
          branche_id: string | null
          coefficient: number
          created_at: string
          date: string
          group_id: string | null
          id: string
          note_max: number
          periode: string | null
          titre: string
          type_note_id: string | null
          user_id: string
        }
        Insert: {
          branche_id?: string | null
          coefficient?: number
          created_at?: string
          date?: string
          group_id?: string | null
          id?: string
          note_max?: number
          periode?: string | null
          titre: string
          type_note_id?: string | null
          user_id: string
        }
        Update: {
          branche_id?: string | null
          coefficient?: number
          created_at?: string
          date?: string
          group_id?: string | null
          id?: string
          note_max?: number
          periode?: string | null
          titre?: string
          type_note_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_branche_id_fkey"
            columns: ["branche_id"]
            isOneToOne: false
            referencedRelation: "Branche"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Evaluation_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "Groupe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Evaluation_type_note_id_fkey"
            columns: ["type_note_id"]
            isOneToOne: false
            referencedRelation: "TypeNote"
            referencedColumns: ["id"]
          },
        ]
      }
      EvaluationQuestion: {
        Row: {
          created_at: string
          evaluation_id: string
          id: string
          note_max: number
          ordre: number | null
          ratio: number
          titre: string
        }
        Insert: {
          created_at?: string
          evaluation_id: string
          id?: string
          note_max?: number
          ordre?: number | null
          ratio?: number
          titre: string
        }
        Update: {
          created_at?: string
          evaluation_id?: string
          id?: string
          note_max?: number
          ordre?: number | null
          ratio?: number
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "EvaluationQuestion_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "Evaluation"
            referencedColumns: ["id"]
          },
        ]
      }
      Groupe: {
        Row: {
          acronyme: string | null
          classe_id: string | null
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
          acronyme?: string | null
          classe_id?: string | null
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
          acronyme?: string | null
          classe_id?: string | null
          created_at?: string
          id?: string
          nom?: string
          ordre?: number | null
          photo_base64?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Groupe_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "Classe"
            referencedColumns: ["id"]
          },
        ]
      }
      Module: {
        Row: {
          branche_id: string | null
          created_at: string
          date_fin: string | null
          id: string
          nom: string
          photo_base64: string | null
          sous_branche_id: string | null
          statut: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          branche_id?: string | null
          created_at?: string
          date_fin?: string | null
          id?: string
          nom: string
          photo_base64?: string | null
          sous_branche_id?: string | null
          statut?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          branche_id?: string | null
          created_at?: string
          date_fin?: string | null
          id?: string
          nom?: string
          photo_base64?: string | null
          sous_branche_id?: string | null
          statut?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_module_sousbranche"
            columns: ["sous_branche_id"]
            isOneToOne: false
            referencedRelation: "SousBranche"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Module_branche_id_fkey"
            columns: ["branche_id"]
            isOneToOne: false
            referencedRelation: "Branche"
            referencedColumns: ["id"]
          },
        ]
      }
      Niveau: {
        Row: {
          created_at: string
          id: string
          nom: string
          ordre: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          ordre?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          ordre?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      PlanificationHebdo: {
        Row: {
          activite_id: string
          created_at: string | null
          eleve_id: string
          id: string
          jour: string
          lieu: string
          semaine_debut: string
          statut: string | null
          updated_at: string | null
        }
        Insert: {
          activite_id: string
          created_at?: string | null
          eleve_id: string
          id?: string
          jour: string
          lieu: string
          semaine_debut: string
          statut?: string | null
          updated_at?: string | null
        }
        Update: {
          activite_id?: string
          created_at?: string | null
          eleve_id?: string
          id?: string
          jour?: string
          lieu?: string
          semaine_debut?: string
          statut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "PlanificationHebdo_activite_id_fkey"
            columns: ["activite_id"]
            isOneToOne: false
            referencedRelation: "Activite"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PlanificationHebdo_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "Eleve"
            referencedColumns: ["id"]
          },
        ]
      }
      Progression: {
        Row: {
          activite_id: string | null
          created_at: string
          date_limite: string | null
          eleve_id: string
          etat: string | null
          id: string
          is_suivi: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activite_id?: string | null
          created_at?: string
          date_limite?: string | null
          eleve_id: string
          etat?: string | null
          id?: string
          is_suivi?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activite_id?: string | null
          created_at?: string
          date_limite?: string | null
          eleve_id?: string
          etat?: string | null
          id?: string
          is_suivi?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Progression_activite_id_fkey"
            columns: ["activite_id"]
            isOneToOne: false
            referencedRelation: "Activite"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Progression_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "Eleve"
            referencedColumns: ["id"]
          },
        ]
      }
      Responsabilite: {
        Row: {
          created_at: string
          id: string
          titre: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          titre: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          titre?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ResponsabiliteEleve: {
        Row: {
          created_at: string
          eleve_id: string
          id: string
          responsabilite_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          eleve_id: string
          id?: string
          responsabilite_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          eleve_id?: string
          id?: string
          responsabilite_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ResponsabiliteEleve_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "Eleve"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ResponsabiliteEleve_responsabilite_id_fkey"
            columns: ["responsabilite_id"]
            isOneToOne: false
            referencedRelation: "Responsabilite"
            referencedColumns: ["id"]
          },
        ]
      }
      Resultat: {
        Row: {
          commentaire: string | null
          created_at: string
          eleve_id: string
          evaluation_id: string
          id: string
          note: number | null
          statut: string
          user_id: string
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          eleve_id: string
          evaluation_id: string
          id?: string
          note?: number | null
          statut?: string
          user_id: string
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          eleve_id?: string
          evaluation_id?: string
          id?: string
          note?: number | null
          statut?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resultat_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "Eleve"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resultat_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "Evaluation"
            referencedColumns: ["id"]
          },
        ]
      }
      ResultatQuestion: {
        Row: {
          created_at: string
          eleve_id: string
          id: string
          note: number | null
          question_id: string
        }
        Insert: {
          created_at?: string
          eleve_id: string
          id?: string
          note?: number | null
          question_id: string
        }
        Update: {
          created_at?: string
          eleve_id?: string
          id?: string
          note?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ResultatQuestion_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "Eleve"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ResultatQuestion_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "EvaluationQuestion"
            referencedColumns: ["id"]
          },
        ]
      }
      SetupPresence: {
        Row: {
          created_at: string
          description: string | null
          id: string
          nom: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          nom: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
          user_id?: string | null
        }
        Relationships: []
      }
      SousBranche: {
        Row: {
          branche_id: string | null
          created_at: string | null
          id: string
          nom: string
          ordre: number | null
          photo_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          branche_id?: string | null
          created_at?: string | null
          id?: string
          nom: string
          ordre?: number | null
          photo_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          branche_id?: string | null
          created_at?: string | null
          id?: string
          nom?: string
          ordre?: number | null
          photo_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sousbranche_branche"
            columns: ["branche_id"]
            isOneToOne: false
            referencedRelation: "Branche"
            referencedColumns: ["id"]
          },
        ]
      }
      SousDomaine: {
        Row: {
          created_at: string
          id: string
          nom: string
          photo_base64: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          photo_base64?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          photo_base64?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      SuiviAdulte: {
        Row: {
          activite_id: string | null
          adulte_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          activite_id?: string | null
          adulte_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          activite_id?: string | null
          adulte_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "SuiviAdulte_activite_id_fkey"
            columns: ["activite_id"]
            isOneToOne: false
            referencedRelation: "TypeActiviteAdulte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SuiviAdulte_adulte_id_fkey"
            columns: ["adulte_id"]
            isOneToOne: false
            referencedRelation: "Adulte"
            referencedColumns: ["id"]
          },
        ]
      }
      TypeActiviteAdulte: {
        Row: {
          created_at: string | null
          id: string
          label: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          user_id?: string | null
        }
        Relationships: []
      }
      TypeMateriel: {
        Row: {
          acronyme: string | null
          created_at: string
          id: string
          nom: string
          user_id: string | null
        }
        Insert: {
          acronyme?: string | null
          created_at?: string
          id?: string
          nom: string
          user_id?: string | null
        }
        Update: {
          acronyme?: string | null
          created_at?: string
          id?: string
          nom?: string
          user_id?: string | null
        }
        Relationships: []
      }
      TypeNote: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          nom: string
          systeme: string
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          nom: string
          systeme: string
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          nom?: string
          systeme?: string
          user_id?: string
        }
        Relationships: []
      }
      UserPreference: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          user_id: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          user_id: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      weekly_planning: {
        Row: {
          activity_title: string
          color_code: string | null
          created_at: string | null
          day_of_week: string
          duration: number | null
          end_time: string | null
          id: string
          order_index: number | null
          period_index: number | null
          start_time: string | null
          user_id: string | null
          week_start_date: string | null
        }
        Insert: {
          activity_title: string
          color_code?: string | null
          created_at?: string | null
          day_of_week: string
          duration?: number | null
          end_time?: string | null
          id?: string
          order_index?: number | null
          period_index?: number | null
          start_time?: string | null
          user_id?: string | null
          week_start_date?: string | null
        }
        Update: {
          activity_title?: string
          color_code?: string | null
          created_at?: string | null
          day_of_week?: string
          duration?: number | null
          end_time?: string | null
          id?: string
          order_index?: number | null
          period_index?: number | null
          start_time?: string | null
          user_id?: string | null
          week_start_date?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      view_retards_count: {
        Row: {
          eleve_id: string | null
          nombre_retards: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Progression_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "Eleve"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_kiosk_modules_activities: {
        Args: { p_student_id: string; p_token: string }
        Returns: Json
      }
      get_kiosk_planification: {
        Args: { p_semaine_debut: string; p_student_id: string; p_token: string }
        Returns: {
          activite_id: string
          jour: string
          lieu: string
          statut: string
        }[]
      }
      get_kiosk_planning_status: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      get_kiosk_progressions: {
        Args: { p_student_id: string; p_token: string }
        Returns: {
          activite_id: string
          etat: string
        }[]
      }
      get_kiosk_progressions_test: { Args: never; Returns: Json }
      get_kiosk_status: { Args: { p_student_id: string }; Returns: boolean }
      get_kiosk_student_data: {
        Args: { p_student_id: string; p_token: string }
        Returns: {
          student: Json
        }[]
      }
      update_kiosk_progression: {
        Args: {
          p_activity_id: string
          p_status: string
          p_student_id: string
          p_token: string
        }
        Returns: undefined
      }
      update_progression_from_kiosk: {
        Args: {
          p_activite_id: string
          p_etat: string
          p_student_id: string
          p_token: string
        }
        Returns: undefined
      }
      upsert_kiosk_planification: {
        Args: {
          p_items: Json
          p_semaine_debut: string
          p_student_id: string
          p_token: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
