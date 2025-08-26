import { Types } from 'mongoose';
export interface ReferenceCheckOptions {
    enableSave?: boolean;
    enableUpdate?: boolean;
    enableDelete?: boolean;
    enableLogging?: boolean;
    batchSize?: number;
}
export interface RefField {
    field: string;
    refTo: string;
}
export interface ValidationResult {
    field: string;
    refTo: string;
    value: Types.ObjectId | Types.ObjectId[] | null;
    isValid: boolean;
}
export interface RefModel {
    modelName: string;
    fields: string[];
}
declare module 'mongoose' {
    interface Document {
        checkReferences(): Promise<ValidationResult[]>;
    }
}
//# sourceMappingURL=types.d.ts.map