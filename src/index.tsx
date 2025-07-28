import React, { useState, useCallback, useEffect } from "react";
import { type FC } from "react";
// import { Retool } from "@tryretool/custom-component-support";

// Enhanced Types
interface FormField {
  id: string;
  type:
    | "title"
    | "text"
    | "textarea"
    | "select"
    | "radio"
    | "checkbox"
    | "file"
    | "readonly";
  title: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string | unknown;
  readOnly?: boolean;
  widget?: string;
  dependsOn?: string;
  showWhen?: string;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  multiple?: boolean;
  captureMode?: "user" | "environment" | "none";
}

interface NavigationRule {
  fieldId: string;
  conditions: Array<{
    value: string;
    nextStepName: string;
  }>;
  defaultStepName?: string;
}

interface Step {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  actionName: string;
  navigationRule?: NavigationRule;
  summaryCheckExpression: string;
}

interface SavedFlow {
  id: string;
  name: string;
  description: string;
  steps: Step[];
  created_at: string;
  updated_at: string;
}

interface TemplateContext {
  workorder?: {
    scopeOfWork?: string;
    clientDescription?: string;
    priority?: string;
    location?: string;
  };
  client?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  technician?: {
    name?: string;
    id?: string;
    trade?: string;
  };
}

// Field Types Configuration
const FIELD_TYPES = [
  { type: "title", label: "Title/Heading", icon: "📋" },
  { type: "text", label: "Text Input", icon: "📝" },
  { type: "textarea", label: "Long Text", icon: "📄" },
  { type: "select", label: "Dropdown", icon: "📋" },
  { type: "radio", label: "Radio Buttons", icon: "⚪" },
  { type: "checkbox", label: "Checkboxes", icon: "☑️" },
  { type: "file", label: "File Upload", icon: "📎" },
  { type: "readonly", label: "Read-only Text", icon: "🔒" },
];

const TEMPLATE_SUGGESTIONS = [
  "#workorder.scopeOfWork",
  "#workorder.clientDescription",
  "#workorder.priority",
  "#workorder.location",
  "#client.name",
  "#client.email",
  "#client.phone",
  "#technician.name",
  "#technician.id",
  "#technician.trade",
];

export const FormBuilder: FC = () => {
  // ✅ ALL HOOKS FIRST - BEFORE ANY CONDITIONAL RETURNS

  // State Management - Fixed with proper initialization
  const [steps, setSteps] = useState<Step[]>([]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [savedFlows, setSavedFlows] = useState<SavedFlow[]>([]);

  // UI state - removed all database-related state
  const [showTemplateHelper, setShowTemplateHelper] = useState<boolean>(false);
  const [hasUnsavedWork, setHasUnsavedWork] = useState<boolean>(false);
  const [showFlowManager, setShowFlowManager] = useState<boolean>(false);
  const [currentFlowName, setCurrentFlowName] =
    useState<string>("New Form Flow");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [jsonOutput, setJsonOutput] = useState<string>("");
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [isNewFlow, setIsNewFlow] = useState<boolean>(true);
  const [componentReady, setComponentReady] = useState(false);

  // Parse state data with proper error handling
  const parsedSteps: Step[] = React.useMemo(() => {
    try {
      const parsed = steps;

      if (parsed.length === 0 && isNewFlow) {
        const defaultStep = {
          id: "step1",
          name: "Page 1",
          description: "First page description",
          fields: [],
          actionName: "submitPage1",
          summaryCheckExpression: "true",
        };
        return [defaultStep];
      }

      return parsed;
    } catch {
      if (isNewFlow) {
        return [
          {
            id: "step1",
            name: "Page 1",
            description: "First page description",
            fields: [],
            actionName: "submitPage1",
            summaryCheckExpression: "true",
          },
        ];
      }
      return [];
    }
  }, [steps, isNewFlow]);

  const parsedSavedFlows: SavedFlow[] = React.useMemo(() => {
    try {
      return savedFlows;
    } catch {
      return [];
    }
  }, [savedFlows]);

  const currentStep = parsedSteps[currentStepIndex] || null;

  // Component ready effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setComponentReady(true);
      console.log("📱 FormBuilder component ready");
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Change tracking for unsaved work detection
  useEffect(() => {
    if (parsedSteps.length > 0) {
      const hasFields = parsedSteps.some((step) => step.fields.length > 0);
      const hasCustomNames = parsedSteps.some(
        (step) => step.name !== "Page 1" && !step.name.startsWith("Page ")
      );
      setHasUnsavedWork(hasFields || hasCustomNames);
    }
  }, [parsedSteps]);

  // Utility function to update steps with change tracking
  const updateSteps = useCallback(
    (newSteps: Step[]) => {
      console.log("🔄 Updating steps:", newSteps.length);
      setSteps(newSteps);
      setHasUnsavedWork(true);
    },
    [setSteps]
  );

  // Auto-save functionality
  useEffect(() => {
    const autoSave = setTimeout(() => {
      if (parsedSteps.length > 0 && hasUnsavedWork && !isNewFlow) {
        const autoSaveData = {
          steps: parsedSteps,
          flowName: currentFlowName,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(
          "formBuilder_autoSave",
          JSON.stringify(autoSaveData)
        );
        console.log("💾 Auto-saved to localStorage");
      }
    }, 30000);

    return () => clearTimeout(autoSave);
  }, [parsedSteps, hasUnsavedWork, isNewFlow, currentFlowName]);

  // Load auto-saved work on mount
  useEffect(() => {
    const autoSaved = localStorage.getItem("formBuilder_autoSave");
    if (autoSaved && parsedSteps.length === 0 && isNewFlow) {
      try {
        const savedData = JSON.parse(autoSaved);
        const timeDiff = Date.now() - new Date(savedData.timestamp).getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 24) {
          const recover = confirm(
            `Found auto-saved work from ${new Date(
              savedData.timestamp
            ).toLocaleString()}. Recover it?`
          );
          if (recover) {
            setSteps(savedData.steps);
            setCurrentFlowName(savedData.flowName || "Recovered Flow");
            setHasUnsavedWork(true);
            setIsNewFlow(false);
            localStorage.removeItem("formBuilder_autoSave");
            setSaveStatus("🔄 Recovered auto-saved work");
            setTimeout(() => setSaveStatus(""), 3000);
          }
        } else {
          localStorage.removeItem("formBuilder_autoSave");
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        localStorage.removeItem("formBuilder_autoSave");
      }
    }
  }, []);

  // Preview mode effects
  useEffect(() => {
    if (previewMode) {
      setPreviewData({});
      setSelectedFieldId(null);
      console.log("🔄 Preview mode activated");
    }
  }, [previewMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.tagName?.toLowerCase() === "input" ||
        target?.tagName?.toLowerCase() === "textarea"
      ) {
        return;
      }

      // Ctrl/Cmd + S = Save locally
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (parsedSteps.length > 0) {
          saveCurrentFlow();
        }
      }

      // Ctrl/Cmd + N = New Flow
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        createNewFlow();
      }

      // P = Toggle Preview
      if (e.key === "p" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setPreviewMode(!previewMode);
      }

      // Escape = Clear selection
      if (e.key === "Escape") {
        setSelectedFieldId(null);
        setShowTemplateHelper(false);
      }

      // Delete = Delete selected field
      if (e.key === "Delete" && selectedFieldId && !previewMode) {
        e.preventDefault();
        if (confirm("Delete selected field?")) {
          deleteField(selectedFieldId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFieldId, previewMode, parsedSteps, currentFlowName]);

  // ✅ EARLY RETURN AFTER ALL HOOKS
  if (!componentReady) {
    return (
      <div
        style={{
          // display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ fontSize: "24px" }}>⏳</div>
        <div>Loading Form Builder...</div>
        <div style={{ fontSize: "12px", color: "#666" }}>
          Initializing components...
        </div>
      </div>
    );
  }

  // ✅ ALL FUNCTIONS AFTER HOOKS AND BEFORE RENDER

  // Generate meaningful field IDs
  const generateMeaningfulId = (title: string, type: string): string => {
    const cleanTitle = title
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(" ")
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join("");

    const typeMap: Record<string, string> = {
      radio: "Choice",
      select: "Selection",
      checkbox: "Options",
      file: "Files",
      text: "Input",
      textarea: "Text",
    };

    const suffix = typeMap[type] || "";
    return cleanTitle || `${type}Field${suffix}_${Date.now()}`;
  };

  const getDefaultWidget = (type: string): string => {
    const widgets: Record<string, string> = {
      text: "text",
      textarea: "textarea",
      select: "select",
      radio: "radio",
      checkbox: "checkboxes",
      file: "file",
      readonly: "textarea",
    };
    return widgets[type] || "text";
  };

  // Template processing functions
  const processTemplateValue = (value: any, context: TemplateContext): any => {
    if (typeof value !== "string" || !value.startsWith("#")) {
      return value;
    }

    try {
      const path = value.substring(1);
      const keys = path.split(".");
      let result: any = context;

      for (const key of keys) {
        if (result && typeof result === "object" && key in result) {
          result = result[key];
        } else {
          return value;
        }
      }

      return result || value;
    } catch (error) {
      console.warn("Template processing error:", error);
      return value;
    }
  };

  const buildTemplateContext = (): TemplateContext => {
    return {
      workorder: {
        scopeOfWork: "Sample work order description",
        clientDescription: "Sample client description",
        priority: "High",
        location: "Sample location",
      },
      client: {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "(555) 123-4567",
      },
      technician: {
        name: "Jane Smith",
        id: "TECH001",
        trade: "Electrician",
      },
    };
  };

  // Enhanced form data generation
  const generateFormData = (fields: FormField[]): object => {
    const formData: any = {};

    fields.forEach((field) => {
      if (field.type === "title") return;

      if (field.defaultValue !== undefined && field.defaultValue !== null) {
        formData[field.id] = field.defaultValue;
      } else {
        switch (field.type) {
          case "checkbox":
            formData[field.id] = [];
            break;
          case "file":
            formData[field.id] = field.multiple ? [] : null;
            break;
          case "text":
          case "textarea":
          case "select":
          case "radio":
          case "readonly":
          default:
            formData[field.id] = "";
            break;
        }
      }
    });

    return formData;
  };

  // Enhanced schema generation with proper form data
  const generateAllSchemas = () => {
    if (!currentStep)
      return { jsonSchema: {}, uiSchema: {}, formData: {}, actionSchema: {} };

    const jsonSchema = {
      type: "object" as const,
      description: currentStep.description,
      properties: {} as Record<string, any>,
      required: [] as string[],
    };

    const uiSchema = {
      "ui:order": [] as string[],
      "ui:submitButtonOptions": {
        submitText: "Continue",
        norender: false,
      },
    } as Record<string, any>;

    const formData = generateFormData(currentStep.fields);

    currentStep.fields.forEach((field: FormField) => {
      if (field.type === "title") return;

      const property: any = {
        title: field.title,
        type:
          field.type === "checkbox"
            ? "array"
            : field.type === "file"
            ? "string"
            : "string",
      };

      // Enhanced property configuration
      if (field.type === "checkbox") {
        property.items = {
          type: "string",
          enum: field.options || [],
        };
        property.uniqueItems = true;
      } else if (["radio", "select"].includes(field.type)) {
        property.enum = field.options || [];
      } else if (field.type === "file") {
        property.format = "data-url";
        property.description = `Max size: ${field.maxFileSize || 10}MB`;
      }

      if (field.defaultValue !== undefined && field.type !== "readonly") {
        property.default = field.defaultValue;
      }

      if (field.readOnly || field.type === "readonly") {
        property.readOnly = true;
      }

      jsonSchema.properties[field.id] = property;

      if (field.required) {
        jsonSchema.required.push(field.id);
      }

      // Enhanced UI Schema
      const uiConfig: any = {
        "ui:widget": getDefaultWidget(field.type),
      };

      if (field.placeholder) {
        uiConfig["ui:placeholder"] = field.placeholder;
      }

      if (field.readOnly || field.type === "readonly") {
        uiConfig["ui:readonly"] = true;
      }

      // UI options for different field types
      if (field.type === "radio") {
        uiConfig["ui:widget"] = "radio";
        uiConfig["ui:options"] = {
          inline: false,
          enumOptions:
            field.options?.map((opt) => ({
              value: opt,
              label: opt,
            })) || [],
        };
      } else if (field.type === "checkbox") {
        uiConfig["ui:widget"] = "checkboxes";
        uiConfig["ui:options"] = {
          inline: false,
          enumOptions:
            field.options?.map((opt) => ({
              value: opt,
              label: opt,
            })) || [],
        };
      } else if (field.type === "select") {
        uiConfig["ui:widget"] = "select";
        uiConfig["ui:options"] = {
          enumOptions: [
            { value: "", label: "Choose an option..." },
            ...(field.options?.map((opt) => ({
              value: opt,
              label: opt,
            })) || []),
          ],
        };
      } else if (field.type === "textarea") {
        uiConfig["ui:widget"] = "textarea";
        uiConfig["ui:options"] = {
          rows: 4,
        };
      } else if (field.type === "file") {
        uiConfig["ui:widget"] = "file";
        uiConfig["ui:options"] = {
          accept: field.acceptedFileTypes?.join(",") || "*/*",
          multiple: field.multiple || false,
        };
      }

      uiSchema[field.id] = uiConfig;
      uiSchema["ui:order"].push(field.id);
    });

    const actionSchema = {
      actionName: currentStep.actionName,
      summaryCheckExpression: currentStep.summaryCheckExpression || "true",
      nextFlowDeterminationExpression: currentStep.navigationRule
        ? convertToExpression(currentStep.navigationRule)
        : "'continue'",
    };

    return { jsonSchema, uiSchema, formData, actionSchema };
  };

  // Navigation rule conversion
  const convertToExpression = (rule: NavigationRule): string => {
    if (!rule.fieldId || !rule.conditions.length) return "'continue'";

    const field = currentStep?.fields.find(
      (f: FormField) => f.id === rule.fieldId
    );
    if (!field) return "'continue'";

    if (field.type === "checkbox") {
      const conditions = rule.conditions
        .map(
          (cond: any) =>
            `formData.${rule.fieldId}.includes('${cond.value}') ? '${cond.nextStepName}'`
        )
        .join(" : ");
      return conditions + ` : '${rule.defaultStepName || "continue"}'`;
    } else {
      const conditions = rule.conditions
        .map(
          (cond: any) =>
            `formData.${rule.fieldId} === '${cond.value}' ? '${cond.nextStepName}'`
        )
        .join(" : ");
      return conditions + ` : '${rule.defaultStepName || "continue"}'`;
    }
  };

  // Generate schemas and export
  const generateSchemas = () => {
    const schemas = generateAllSchemas();

    const output = {
      jsonSchema: schemas.jsonSchema,
      uiSchema: schemas.uiSchema,
      formData: schemas.formData,
      actionSchema: schemas.actionSchema,
      totalFields: currentStep?.fields.length || 0,
      requiredFields: currentStep?.fields.filter((f) => f.required).length || 0,
    };

    setJsonOutput(JSON.stringify(output, null, 2));
    console.log("📋 Generated schemas:", output);
  };

  // Export complete flow as JSON
  const exportCompleteFlow = () => {
    if (parsedSteps.length === 0) {
      setSaveStatus("⚠️ Cannot export empty flow");
      setTimeout(() => setSaveStatus(""), 3000);
      return;
    }

    const flowData = {
      name: currentFlowName,
      description: `Form with ${parsedSteps.length} pages`,
      version: "1.0",
      created: new Date().toISOString(),
      steps: parsedSteps.map((step, index) => {
        const schemas = generateAllSchemas();
        return {
          id: step.id,
          name: step.name,
          description: step.description,
          order: index + 1,
          schemas: schemas,
        };
      }),
      metadata: {
        totalSteps: parsedSteps.length,
        totalFields: parsedSteps.reduce(
          (sum, step) => sum + step.fields.length,
          0
        ),
        fieldTypes: Array.from(
          new Set(parsedSteps.flatMap((step) => step.fields.map((f) => f.type)))
        ),
      },
    };

    const dataStr = JSON.stringify(flowData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentFlowName
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}_flow.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSaveStatus("📦 Flow exported as JSON");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  // Enhanced option parsing
  const parseFieldOptions = (optionsText: string): string[] => {
    return optionsText
      .split("\n")
      .map((option) => option.trim())
      .filter((option) => option.length > 0);
  };

  // Field management functions
  const addField = (fieldType: string) => {
    console.log(`➕ Adding field: ${fieldType}`);

    if (parsedSteps.length === 0) {
      const defaultStep: Step = {
        id: "step1",
        name: "Page 1",
        description: "First page description",
        fields: [],
        actionName: "submitPage1",
        summaryCheckExpression: "true",
      };
      setSteps([defaultStep]);
      setCurrentStepIndex(0);
      setIsNewFlow(true);
    }

    let baseTitle = `${
      fieldType.charAt(0).toUpperCase() + fieldType.slice(1)
    } Field`;
    let defaultValue: any = "";

    switch (fieldType) {
      case "title":
        baseTitle = "Section Title";
        defaultValue = "";
        break;
      case "text":
        baseTitle = "Text Input";
        defaultValue = "";
        break;
      case "textarea":
        baseTitle = "Long Text";
        defaultValue = "";
        break;
      case "select":
        baseTitle = "Select from List";
        defaultValue = "";
        break;
      case "radio":
        baseTitle = "Choose Option";
        defaultValue = "";
        break;
      case "checkbox":
        baseTitle = "Select Multiple";
        defaultValue = [];
        break;
      case "file":
        baseTitle = "Upload Files";
        defaultValue = null;
        break;
      case "readonly":
        baseTitle = "Read-only Text";
        defaultValue = "";
        break;
    }

    const meaningfulId = generateMeaningfulId(baseTitle, fieldType);

    const newField: FormField = {
      id: meaningfulId,
      type: fieldType as FormField["type"],
      title: baseTitle,
      required: fieldType === "title" ? false : false,
      placeholder: ["text", "textarea"].includes(fieldType)
        ? "Enter value"
        : undefined,
      options: ["select", "radio", "checkbox"].includes(fieldType)
        ? ["Option 1", "Option 2", "Option 3"]
        : undefined,
      defaultValue,
      readOnly: fieldType === "readonly",
      widget: getDefaultWidget(fieldType),
      acceptedFileTypes: fieldType === "file" ? ["image/*"] : undefined,
      maxFileSize: fieldType === "file" ? 10 : undefined,
      multiple: fieldType === "file" ? false : undefined,
      captureMode: fieldType === "file" ? "none" : undefined,
    };

    const updatedSteps = [...parsedSteps];
    const targetStepIndex = Math.max(
      0,
      Math.min(currentStepIndex, updatedSteps.length - 1)
    );

    if (updatedSteps[targetStepIndex]) {
      updatedSteps[targetStepIndex].fields.push(newField);
      updateSteps(updatedSteps);
      setSelectedFieldId(newField.id);
      console.log(`✅ Field added: ${newField.id}`);
    }
  };

  // Field movement functions
  const moveField = (fromIndex: number, toIndex: number) => {
    if (!currentStep) return;

    console.log(`🔀 Moving field from ${fromIndex} to ${toIndex}`);
    const updatedSteps = [...parsedSteps];
    const fields = [...updatedSteps[currentStepIndex].fields];
    const [movedField] = fields.splice(fromIndex, 1);
    fields.splice(toIndex, 0, movedField);
    updatedSteps[currentStepIndex].fields = fields;
    updateSteps(updatedSteps);
  };

  const moveFieldUp = (index: number) => {
    if (index > 0) moveField(index, index - 1);
  };

  const moveFieldDown = (index: number) => {
    if (!currentStep) return;
    if (index < currentStep.fields.length - 1) moveField(index, index + 1);
  };

  // Enhanced field update
  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    if (!currentStep) return;

    console.log(`🔧 Updating field ${fieldId}:`, updates);

    const updatedSteps = [...parsedSteps];
    const fieldIndex = updatedSteps[currentStepIndex].fields.findIndex(
      (f: FormField) => f.id === fieldId
    );

    if (fieldIndex === -1) {
      console.error(`❌ Field ${fieldId} not found`);
      return;
    }

    const currentField = updatedSteps[currentStepIndex].fields[fieldIndex];

    // Handle type changes properly
    if (updates.type && updates.type !== currentField.type) {
      if (updates.type === "title") {
        updates.required = false;
        updates.placeholder = undefined;
        updates.options = undefined;
      }

      if (!["text", "textarea"].includes(updates.type)) {
        updates.placeholder = undefined;
      }

      if (updates.type === "checkbox") {
        updates.defaultValue = [];
      } else if (updates.type === "file") {
        updates.defaultValue = updates.multiple ? [] : null;
      } else if (
        ["text", "textarea", "select", "radio", "readonly"].includes(
          updates.type
        )
      ) {
        updates.defaultValue = "";
      }

      if (["select", "radio", "checkbox"].includes(updates.type)) {
        updates.options = updates.options || [
          "Option 1",
          "Option 2",
          "Option 3",
        ];
      } else {
        updates.options = undefined;
      }
    }

    // Handle default value updates based on current type
    if (updates.defaultValue !== undefined) {
      const targetType = updates.type || currentField.type;

      if (targetType === "checkbox" && !Array.isArray(updates.defaultValue)) {
        updates.defaultValue = [];
      } else if (targetType === "file") {
        updates.defaultValue = currentField.multiple ? [] : null;
      } else if (
        ["text", "textarea", "select", "radio", "readonly"].includes(
          targetType
        ) &&
        Array.isArray(updates.defaultValue)
      ) {
        updates.defaultValue = "";
      }
    }

    updatedSteps[currentStepIndex].fields[fieldIndex] = {
      ...currentField,
      ...updates,
    };

    console.log(
      `✅ Field updated:`,
      updatedSteps[currentStepIndex].fields[fieldIndex]
    );
    updateSteps(updatedSteps);
  };

  // Field deletion with cleanup
  const deleteField = (fieldId: string) => {
    if (!currentStep) return;

    console.log(`🗑️ Deleting field: ${fieldId}`);
    const updatedSteps = [...parsedSteps];
    updatedSteps[currentStepIndex].fields = updatedSteps[
      currentStepIndex
    ].fields.filter((f: FormField) => f.id !== fieldId);

    // Clean up navigation rules referencing deleted field
    if (updatedSteps[currentStepIndex].navigationRule?.fieldId === fieldId) {
      delete updatedSteps[currentStepIndex].navigationRule;
    }

    // Clean up dependent fields
    updatedSteps[currentStepIndex].fields.forEach((field: FormField) => {
      if (field.dependsOn === fieldId) {
        field.dependsOn = undefined;
        field.showWhen = undefined;
      }
    });

    updateSteps(updatedSteps);
    setSelectedFieldId(null);
    console.log(`✅ Field deleted and dependencies cleaned`);
  };

  // Enhanced step management
  const addStep = () => {
    const stepNumber = parsedSteps.length + 1;
    const newStep: Step = {
      id: `step${stepNumber}`,
      name: `Page ${stepNumber}`,
      description: `Page ${stepNumber} description`,
      fields: [],
      actionName: `submitPage${stepNumber}`,
      summaryCheckExpression: "true",
    };

    updateSteps([...parsedSteps, newStep]);
    setCurrentStepIndex(parsedSteps.length); // Move to new step
    setSelectedFieldId(null);
    console.log("➕ Added step:", newStep.name);
  };

  const deleteStep = (stepIndex: number) => {
    if (parsedSteps.length <= 1) {
      setSaveStatus("⚠️ Cannot delete the last page");
      setTimeout(() => setSaveStatus(""), 3000);
      return;
    }

    const stepName = parsedSteps[stepIndex]?.name || `Page ${stepIndex + 1}`;
    if (!confirm(`Delete "${stepName}"? This cannot be undone.`)) {
      return;
    }

    const updatedSteps = parsedSteps.filter((_, index) => index !== stepIndex);
    updateSteps(updatedSteps);

    if (currentStepIndex >= updatedSteps.length) {
      setCurrentStepIndex(Math.max(0, updatedSteps.length - 1));
    } else if (currentStepIndex >= stepIndex) {
      setCurrentStepIndex(Math.max(0, currentStepIndex - 1));
    }

    setSelectedFieldId(null);
    console.log(`🗑️ Deleted step: ${stepName}`);
  };

  // Flow management functions
  const createNewFlow = () => {
    if (
      hasUnsavedWork &&
      !confirm("Discard unsaved changes and create new flow?")
    ) {
      return;
    }

    const newSteps = [
      {
        id: "step1",
        name: "Page 1",
        description: "First page description",
        fields: [],
        actionName: "submitPage1",
        summaryCheckExpression: "true",
      },
    ];

    setSteps(newSteps);
    setCurrentFlowName("New Form Flow");
    setCurrentStepIndex(0);
    setPreviewData({});
    setSelectedFieldId(null);
    setShowFlowManager(false);
    setIsNewFlow(true);
    setHasUnsavedWork(false);
    setSaveStatus("");
    console.log("🆕 Created new flow");
  };

  // Local flow management
  const saveCurrentFlow = () => {
    if (parsedSteps.length === 0) {
      setSaveStatus("⚠️ Cannot save empty flow");
      setTimeout(() => setSaveStatus(""), 3000);
      return;
    }

    const flowName = prompt("Enter flow name:", currentFlowName)?.trim();
    if (!flowName) return;

    const newFlow: SavedFlow = {
      id: Date.now().toString(),
      name: flowName,
      description: `Flow with ${parsedSteps.length} pages`,
      steps: parsedSteps,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const flows = [...parsedSavedFlows];
    const existingIndex = flows.findIndex(
      (f: SavedFlow) => f.name === flowName
    );

    if (existingIndex >= 0) {
      if (confirm(`Flow "${flowName}" exists. Overwrite?`)) {
        flows[existingIndex] = {
          ...newFlow,
          created_at: flows[existingIndex].created_at,
        };
      } else {
        return;
      }
    } else {
      flows.push(newFlow);
    }

    setSavedFlows(flows);
    setCurrentFlowName(flowName);
    setHasUnsavedWork(false);
    setSaveStatus(`✅ Saved "${flowName}" locally`);
    setTimeout(() => setSaveStatus(""), 3000);
  };

  const loadFlow = (flow: SavedFlow) => {
    if (hasUnsavedWork && !confirm("Discard unsaved changes?")) {
      return;
    }

    setSteps(flow.steps);
    setCurrentFlowName(flow.name);
    setCurrentStepIndex(0);
    setPreviewData({});
    setSelectedFieldId(null);
    setShowFlowManager(false);
    setIsNewFlow(false);
    setHasUnsavedWork(false);
    setSaveStatus(`✅ Loaded "${flow.name}"`);
    setTimeout(() => setSaveStatus(""), 3000);
  };

  const deleteFlow = (flowId: string) => {
    const flow = parsedSavedFlows.find((f: SavedFlow) => f.id === flowId);
    if (!flow) return;

    if (!confirm(`Delete "${flow.name}"?`)) return;

    const flows = parsedSavedFlows.filter((f: SavedFlow) => f.id !== flowId);
    setSavedFlows(flows);
    setSaveStatus(`🗑️ Deleted "${flow.name}"`);
    setTimeout(() => setSaveStatus(""), 3000);
  };

  // Template functions
  const insertTemplate = (fieldId: string, templateKey: string) => {
    const field = currentStep?.fields.find((f: FormField) => f.id === fieldId);
    if (!field) return;

    updateField(fieldId, { defaultValue: templateKey });
    setShowTemplateHelper(false);
    setSaveStatus(`📝 Template inserted: ${templateKey}`);
    setTimeout(() => setSaveStatus(""), 2000);
    console.log(`📝 Inserted template ${templateKey} into field ${fieldId}`);
  };

  // File upload handling
  const handleFileUpload = (fieldId: string, files: FileList | null) => {
    if (!files || !currentStep) return;

    const field = currentStep.fields.find((f: FormField) => f.id === fieldId);
    if (!field) return;

    const fileArray = Array.from(files);

    const maxSize = (field.maxFileSize || 10) * 1024 * 1024;
    const oversizedFiles = fileArray.filter((f: File) => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      setSaveStatus(
        `❌ Files too large: ${oversizedFiles.map((f) => f.name).join(", ")}`
      );
      setTimeout(() => setSaveStatus(""), 5000);
      return;
    }

    if (field.acceptedFileTypes && field.acceptedFileTypes.length > 0) {
      const invalidFiles = fileArray.filter((f: File) => {
        return !field.acceptedFileTypes!.some((acceptedType) => {
          if (acceptedType.includes("*")) {
            const baseType = acceptedType.split("/")[0];
            return f.type.startsWith(baseType);
          }
          return f.type === acceptedType;
        });
      });

      if (invalidFiles.length > 0) {
        setSaveStatus(
          `❌ Invalid file types: ${invalidFiles.map((f) => f.name).join(", ")}`
        );
        setTimeout(() => setSaveStatus(""), 5000);
        return;
      }
    }

    const fileData = field.multiple
      ? fileArray.map((f: File) => ({
          name: f.name,
          size: f.size,
          type: f.type,
          url: URL.createObjectURL(f),
        }))
      : {
          name: files[0].name,
          size: files[0].size,
          type: files[0].type,
          url: URL.createObjectURL(files[0]),
        };

    updatePreviewData(fieldId, fileData);
    console.log(`📁 Files uploaded for ${fieldId}:`, fileData);
  };

  // Enhanced preview data updates
  const updatePreviewData = (fieldId: string, value: any) => {
    console.log(`🔄 Preview data update: ${fieldId} =`, value);
    setPreviewData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  // Render field value with template processing
  const renderFieldValue = (field: FormField, previewValue: any): any => {
    if (
      previewMode &&
      typeof field.defaultValue === "string" &&
      field.defaultValue.startsWith("#")
    ) {
      const context = buildTemplateContext();
      const processedDefault = processTemplateValue(
        field.defaultValue,
        context
      );
      return previewValue !== undefined ? previewValue : processedDefault;
    }
    return previewValue !== undefined ? previewValue : field.defaultValue;
  };

  // Field visibility logic
  const isFieldVisible = (field: FormField): boolean => {
    if (!field.dependsOn || !field.showWhen) return true;

    const dependentValue = previewData[field.dependsOn];
    const parentField = currentStep?.fields.find(
      (f: FormField) => f.id === field.dependsOn
    );

    if (!parentField) return false;

    if (
      dependentValue === undefined ||
      dependentValue === null ||
      dependentValue === ""
    ) {
      return false;
    }

    if (parentField.type === "radio" || parentField.type === "select") {
      return dependentValue === field.showWhen;
    }

    if (parentField.type === "checkbox") {
      const selectedValues = Array.isArray(dependentValue)
        ? dependentValue
        : [];
      return selectedValues.includes(field.showWhen);
    }

    return dependentValue === field.showWhen;
  };

  // Enhanced form validation
  const validateCurrentStep = (): { valid: boolean; errors: string[] } => {
    if (!currentStep) return { valid: true, errors: [] };

    const errors: string[] = [];

    if (previewMode) {
      currentStep.fields.forEach((field) => {
        if (field.required && field.type !== "title" && isFieldVisible(field)) {
          const value = previewData[field.id];
          if (
            value === undefined ||
            value === null ||
            value === "" ||
            (Array.isArray(value) && value.length === 0)
          ) {
            errors.push(`"${field.title}" is required`);
          }
        }
      });
    } else {
      currentStep.fields.forEach((field) => {
        if (!field.title?.trim()) {
          errors.push(`Field "${field.id}" needs a title`);
        }

        if (
          ["select", "radio", "checkbox"].includes(field.type) &&
          (!field.options || field.options.length === 0)
        ) {
          errors.push(`"${field.title}" needs options`);
        }

        if (
          field.type === "file" &&
          field.maxFileSize &&
          field.maxFileSize > 100
        ) {
          errors.push(`"${field.title}" file size limit too high`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  };

  // const validateAllSteps = (): { valid: boolean; errors: string[] } => {
  //   const allErrors: string[] = [];

  //   if (parsedSteps.length === 0) {
  //     allErrors.push("Flow must have at least one page");
  //     return { valid: false, errors: allErrors };
  //   }

  //   parsedSteps.forEach((step, index) => {
  //     if (!step.name?.trim()) {
  //       allErrors.push(`Page ${index + 1} needs a name`);
  //     }

  //     if (step.fields.length === 0) {
  //       allErrors.push(`"${step.name}" has no fields`);
  //     }

  //     const fieldIds = step.fields.map((f) => f.id);
  //     const duplicateIds = fieldIds.filter(
  //       (id, idx) => fieldIds.indexOf(id) !== idx
  //     );
  //     if (duplicateIds.length > 0) {
  //       allErrors.push(`"${step.name}" has duplicate field IDs`);
  //     }
  //   });

  //   return { valid: allErrors.length === 0, errors: allErrors };
  // };

  // // Navigation logic for preview mode
  // const getNavigationFields = () => {
  //   if (!currentStep) return [];
  //   return currentStep.fields.filter((f: FormField) =>
  //     ["radio", "select", "checkbox"].includes(f.type)
  //   );
  // };

  const getNextStepLogic = () => {
    if (!currentStep) return "No current step";

    const rule = currentStep.navigationRule;
    if (!rule) return "Continue to next page";

    const fieldValue = previewData[rule.fieldId];
    if (fieldValue === undefined || fieldValue === null || fieldValue === "") {
      return "No value selected";
    }

    const field = currentStep.fields.find(
      (f: FormField) => f.id === rule.fieldId
    );
    if (!field) return "Navigation field not found";

    let matchedCondition = null;
    if (field.type === "checkbox") {
      const selectedValues = Array.isArray(fieldValue) ? fieldValue : [];
      matchedCondition = rule.conditions.find((cond: any) =>
        selectedValues.includes(cond.value)
      );
    } else {
      matchedCondition = rule.conditions.find(
        (cond: any) => cond.value === fieldValue
      );
    }

    if (matchedCondition) {
      return `"${fieldValue}" → "${matchedCondition.nextStepName}"`;
    } else {
      return `"${fieldValue}" → "${rule.defaultStepName || "continue"}"`;
    }
  };

  const executeNavigation = () => {
    if (!currentStep) return;

    const rule = currentStep.navigationRule;
    console.log("🚀 Navigation:", {
      hasRule: !!rule,
      currentStep: currentStepIndex,
      totalSteps: parsedSteps.length,
      formData: previewData,
    });

    const validation = validateCurrentStep();
    if (!validation.valid) {
      setSaveStatus(`⚠️ ${validation.errors.length} validation error(s)`);
      setTimeout(() => setSaveStatus(""), 3000);
      return;
    }

    if (!rule) {
      if (currentStepIndex < parsedSteps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
        setPreviewData({});
      } else {
        setSaveStatus("🎉 Form Complete!");
        setTimeout(() => setSaveStatus(""), 3000);
      }
      return;
    }

    const fieldValue = previewData[rule.fieldId];
    const field = currentStep.fields.find(
      (f: FormField) => f.id === rule.fieldId
    );

    if (
      !field ||
      fieldValue === undefined ||
      fieldValue === "" ||
      (Array.isArray(fieldValue) && fieldValue.length === 0)
    ) {
      setSaveStatus("⚠️ Please complete required fields");
      setTimeout(() => setSaveStatus(""), 3000);
      return;
    }

    let targetStep = rule.defaultStepName || "continue";
    if (field.type === "checkbox") {
      const selectedValues = Array.isArray(fieldValue) ? fieldValue : [];
      const matchedCondition = rule.conditions.find((cond: any) =>
        selectedValues.includes(cond.value)
      );
      if (matchedCondition) targetStep = matchedCondition.nextStepName;
    } else {
      const matchedCondition = rule.conditions.find(
        (cond: any) => cond.value === fieldValue
      );
      if (matchedCondition) targetStep = matchedCondition.nextStepName;
    }

    if (targetStep === "continue") {
      if (currentStepIndex < parsedSteps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
        setPreviewData({});
      } else {
        setSaveStatus("🎉 Form Complete!");
        setTimeout(() => setSaveStatus(""), 3000);
      }
    } else if (targetStep === "end") {
      setSaveStatus("🛑 Form ended based on selection");
      setTimeout(() => setSaveStatus(""), 3000);
    } else if (targetStep === "skip") {
      setCurrentStepIndex(parsedSteps.length - 1);
      setPreviewData({});
    } else {
      const targetStepIndex = parsedSteps.findIndex(
        (s: Step) => s.name === targetStep
      );

      if (targetStepIndex !== -1) {
        setCurrentStepIndex(targetStepIndex);
        setPreviewData({});
      } else {
        setSaveStatus(`❓ Target "${targetStep}" not found`);
        setTimeout(() => setSaveStatus(""), 3000);
      }
    }
  };

  // Clipboard operations
  const copyFieldToClipboard = (field: FormField) => {
    const fieldData = {
      ...field,
      id: `${field.id}_copy_${Date.now()}`,
    };

    navigator.clipboard
      .writeText(JSON.stringify(fieldData, null, 2))
      .then(() => {
        setSaveStatus("📋 Field copied to clipboard");
        setTimeout(() => setSaveStatus(""), 2000);
      })
      .catch(() => {
        setSaveStatus("❌ Failed to copy field");
        setTimeout(() => setSaveStatus(""), 2000);
      });
  };

  const pasteFieldFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const fieldData = JSON.parse(clipboardText) as FormField;

      if (fieldData && fieldData.type && fieldData.title && fieldData.id) {
        const updatedSteps = [...parsedSteps];
        if (updatedSteps[currentStepIndex]) {
          updatedSteps[currentStepIndex].fields.push(fieldData);
          updateSteps(updatedSteps);
          setSelectedFieldId(fieldData.id);
          setSaveStatus("📋 Field pasted");
          setTimeout(() => setSaveStatus(""), 2000);
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setSaveStatus("❌ Failed to paste field");
      setTimeout(() => setSaveStatus(""), 2000);
    }
  };

  // Computed values
  const selectedField =
    selectedFieldId && currentStep
      ? currentStep.fields.find((f: FormField) => f.id === selectedFieldId)
      : null;

  const dependencySourceFields = currentStep
    ? currentStep.fields.filter(
        (f: FormField) =>
          ["radio", "select", "checkbox"].includes(f.type) &&
          f.id !== selectedFieldId
      )
    : [];

  // Navigation rule management
  // const updateNavigationRule = (rule: Partial<NavigationRule>) => {
  //   if (!currentStep) return;

  //   console.log(`🔀 Updating navigation rule:`, rule);
  //   const updatedSteps = [...parsedSteps];
  //   updatedSteps[currentStepIndex].navigationRule = {
  //     ...updatedSteps[currentStepIndex].navigationRule,
  //     ...rule,
  //   } as NavigationRule;
  //   updateSteps(updatedSteps);
  // };

  // const removeNavigationRule = () => {
  //   if (!currentStep) return;

  //   console.log(`❌ Removing navigation rule`);
  //   const updatedSteps = [...parsedSteps];
  //   delete updatedSteps[currentStepIndex].navigationRule;
  //   updateSteps(updatedSteps);
  // };

  // Drag and drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    item: {
      type: string;
      fieldType?: string;
      field?: FormField;
      index?: number;
    }
  ) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    console.log("🎯 Drag started:", item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex?: number) => {
    e.preventDefault();

    try {
      const draggedItem = JSON.parse(
        e.dataTransfer.getData("application/json")
      );
      console.log("📦 Drop event:", { draggedItem, dropIndex });

      if (draggedItem.type === "fieldType" && draggedItem.fieldType) {
        addField(draggedItem.fieldType);
      } else if (
        draggedItem.type === "field" &&
        draggedItem.index !== undefined &&
        dropIndex !== undefined
      ) {
        moveField(draggedItem.index, dropIndex);
      }
    } catch (error) {
      console.error("Drop error:", error);
    }
  };

  // Step name update handler
  const updateStepProperty = (
    property: "name" | "description",
    value: string
  ) => {
    if (!currentStep) return;

    const updatedSteps = [...parsedSteps];
    updatedSteps[currentStepIndex][property] = value;
    updateSteps(updatedSteps);
  };

  // ✅ MAIN RENDER
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ENHANCED HEADER */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "8px",
            }}
          >
            <h1
              style={{
                margin: "0",
                fontSize: "24px",
                fontWeight: "600",
                color: "#1a1a1a",
              }}
            >
              Dynamic Form Builder
            </h1>
            <div
              style={{
                padding: "4px 12px",
                // backgroundColor: isNewFlow ? "#fef3c7" : "#f0f9ff",
                border: `1px solid ${isNewFlow ? "#f59e0b" : "#0ea5e9"}`,
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "500",
                color: isNewFlow ? "#92400e" : "#0369a1",
              }}
            >
              {isNewFlow ? "🆕 New Flow" : currentFlowName}
            </div>
            {hasUnsavedWork && (
              <div
                style={{
                  padding: "4px 12px",
                  // backgroundColor: "#fef2f2",
                  border: "1px solid #ef4444",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#dc2626",
                }}
              >
                ⚠️ Unsaved Changes
              </div>
            )}
            {saveStatus && (
              <div
                style={{
                  padding: "4px 12px",
                  backgroundColor: saveStatus.includes("✅")
                    ? "#f0fdf4"
                    : saveStatus.includes("❌")
                    ? "#fef2f2"
                    : "#fefce8",
                  border: `1px solid ${
                    saveStatus.includes("✅")
                      ? "#22c55e"
                      : saveStatus.includes("❌")
                      ? "#ef4444"
                      : "#eab308"
                  }`,
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: saveStatus.includes("✅")
                    ? "#15803d"
                    : saveStatus.includes("❌")
                    ? "#dc2626"
                    : "#a16207",
                }}
              >
                {saveStatus}
              </div>
            )}
          </div>

          {/* FLOW MANAGEMENT CONTROLS */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* Save Locally */}
            <button
              onClick={saveCurrentFlow}
              disabled={parsedSteps.length === 0}
              style={{
                padding: "8px 12px",
                border: "none",
                borderRadius: "6px",
                backgroundColor:
                  parsedSteps.length === 0 ? "#9ca3af" : "#10b981",
                // color: "white",
                cursor: parsedSteps.length === 0 ? "not-allowed" : "pointer",
                fontWeight: "500",
                fontSize: "13px",
                opacity: parsedSteps.length === 0 ? 0.7 : 1,
              }}
            >
              💾 Save Locally
            </button>

            {/* Export JSON */}
            <button
              onClick={exportCompleteFlow}
              disabled={parsedSteps.length === 0}
              style={{
                padding: "8px 12px",
                border: "none",
                borderRadius: "6px",
                backgroundColor:
                  parsedSteps.length === 0 ? "#9ca3af" : "#8b5cf6",
                // color: "white",
                cursor: parsedSteps.length === 0 ? "not-allowed" : "pointer",
                fontWeight: "500",
                fontSize: "13px",
                opacity: parsedSteps.length === 0 ? 0.7 : 1,
              }}
            >
              📦 Export JSON
            </button>

            {/* New Flow */}
            <button
              onClick={createNewFlow}
              style={{
                padding: "8px 12px",
                border: "1px solid #6b7280",
                borderRadius: "6px",
                // backgroundColor: "white",
                color: "#374151",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "13px",
              }}
            >
              New Flow
            </button>

            {/* Local Flow Manager */}
            <button
              onClick={() => setShowFlowManager(!showFlowManager)}
              style={{
                padding: "8px 12px",
                border: "1px solid #8b5cf6",
                borderRadius: "6px",
                // backgroundColor: showFlowManager ? "#8b5cf6" : "white",
                // color: showFlowManager ? "white" : "#8b5cf6",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "13px",
              }}
            >
              Local Flows ({parsedSavedFlows.length})
            </button>

            {/* Preview Toggle */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                border: "1px solid #10b981",
                borderRadius: "6px",
                // backgroundColor: previewMode ? "#10b981" : "white",
                // color: previewMode ? "white" : "#10b981",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "13px",
              }}
            >
              <input
                type="checkbox"
                checked={previewMode}
                onChange={(e) => {
                  setPreviewMode(e.target.checked);
                  if (e.target.checked) {
                    setSelectedFieldId(null);
                  }
                }}
                style={{ margin: 0 }}
              />
              Preview Mode
            </label>

            <button
              onClick={generateSchemas}
              disabled={!currentStep || currentStep.fields.length === 0}
              style={{
                padding: "8px 12px",
                backgroundColor:
                  !currentStep || currentStep.fields.length === 0
                    ? "#9ca3af"
                    : "#f59e0b",
                // color: "white",
                border: "none",
                borderRadius: "6px",
                cursor:
                  !currentStep || currentStep.fields.length === 0
                    ? "not-allowed"
                    : "pointer",
                fontWeight: "500",
                fontSize: "13px",
                opacity:
                  !currentStep || currentStep.fields.length === 0 ? 0.7 : 1,
              }}
            >
              Generate Schema
            </button>

            {/* Validation Status */}
            {!previewMode &&
              (() => {
                const validation = validateCurrentStep();
                return validation.errors.length > 0 ? (
                  <div
                    style={{
                      padding: "6px 12px",
                      // backgroundColor: "#fef2f2",
                      border: "1px solid #ef4444",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#dc2626",
                      maxWidth: "200px",
                    }}
                    title={validation.errors.join("\n")}
                  >
                    ⚠️ {validation.errors.length} issue
                    {validation.errors.length > 1 ? "s" : ""}
                  </div>
                ) : null;
              })()}
          </div>

          {/* PAGE TABS */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              alignItems: "center",
              marginTop: "12px",
              flexWrap: "wrap",
            }}
          >
            {parsedSteps.map((step: Step, index: number) => (
              <div
                key={step.id}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <button
                  onClick={() => {
                    setCurrentStepIndex(index);
                    if (previewMode) setPreviewData({});
                    setSelectedFieldId(null);
                  }}
                  style={{
                    padding: "6px 12px",
                    paddingRight: parsedSteps.length > 1 ? "24px" : "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    // backgroundColor:
                    //   index === currentStepIndex ? "#f3f4f6" : "white",
                    color: "#374151",
                    cursor: "pointer",
                    fontWeight: index === currentStepIndex ? "500" : "400",
                    fontSize: "13px",
                    minWidth: "80px",
                    textAlign: "left",
                  }}
                >
                  {step.name}
                  {step.fields.length === 0 && (
                    <span
                      style={{
                        color: "#ef4444",
                        fontSize: "10px",
                        marginLeft: "4px",
                      }}
                    >
                      (empty)
                    </span>
                  )}
                </button>
                {parsedSteps.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteStep(index);
                    }}
                    style={{
                      position: "absolute",
                      right: "4px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "16px",
                      height: "16px",
                      backgroundColor: "#ef4444",
                      // color: "white",
                      border: "none",
                      borderRadius: "50%",
                      cursor: "pointer",
                      fontSize: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={`Delete ${step.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addStep}
              style={{
                padding: "6px 12px",
                border: "1px dashed #d1d5db",
                borderRadius: "6px",
                // backgroundColor: "white",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              + Add Page
            </button>
          </div>
        </div>
      </div>

      {/* LOCAL FLOW MANAGER PANEL */}
      {showFlowManager && (
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "600",
                color: "#1f2937",
              }}
            >
              Local Saved Flows
            </h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={saveCurrentFlow}
                disabled={parsedSteps.length === 0}
                style={{
                  backgroundColor:
                    parsedSteps.length === 0 ? "#9ca3af" : "#8b5cf6",
                  // color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: parsedSteps.length === 0 ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: "500",
                }}
              >
                Save Current
              </button>
              <button
                onClick={() => setShowFlowManager(false)}
                style={{
                  // backgroundColor: "#f3f4f6",
                  color: "#6b7280",
                  border: "1px solid #d1d5db",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Close
              </button>
            </div>
          </div>

          {parsedSavedFlows.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px",
                color: "#6b7280",
                borderRadius: "8px",
                border: "2px dashed #d1d5db",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>💾</div>
              <div style={{ fontSize: "16px", marginBottom: "8px" }}>
                No local flows saved
              </div>
              <div style={{ fontSize: "14px" }}>
                Save your current work to see it here
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "12px",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              }}
            >
              {parsedSavedFlows.map((flow: SavedFlow) => (
                <div
                  key={flow.id}
                  style={{
                    // backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "16px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1f2937",
                    }}
                  >
                    {flow.name}
                  </h3>
                  <p
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "12px",
                      color: "#6b7280",
                    }}
                  >
                    {flow.description}
                  </p>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#9ca3af",
                      marginBottom: "12px",
                    }}
                  >
                    {flow.steps.length} pages • Updated{" "}
                    {new Date(flow.updated_at).toLocaleDateString()}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => loadFlow(flow)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#0ea5e9",
                        // color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "11px",
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteFlow(flow.id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#ef4444",
                        // color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "11px",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TEMPLATE HELPER PANEL */}
      {showTemplateHelper && !previewMode && selectedField && (
        <div
          style={{
            padding: "16px 24px",
            // backgroundColor: "#fefce8",
            borderBottom: "1px solid #eab308",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: "600",
                color: "#a16207",
              }}
            >
              Available Templates for "{selectedField.title}"
            </h3>
            <button
              onClick={() => setShowTemplateHelper(false)}
              style={{
                // backgroundColor: "transparent",
                color: "#6b7280",
                border: "none",
                padding: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#6b7280",
              marginBottom: "12px",
            }}
          >
            Click a template to insert it as the field's default value.
            Templates are replaced with actual data at runtime.
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {TEMPLATE_SUGGESTIONS.map((template) => (
              <button
                key={template}
                onClick={() => insertTemplate(selectedField.id, template)}
                style={{
                  padding: "6px 12px",
                  // backgroundColor: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: "#374151",
                }}
              >
                {template}
              </button>
            ))}
          </div>

          {selectedField &&
            // selectedField.defaultValue &&
            typeof selectedField.defaultValue === "string" &&
            selectedField.defaultValue.startsWith("#") && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  // backgroundColor: "#f0f9ff",
                  border: "1px solid #0ea5e9",
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#0369a1",
                    marginBottom: "4px",
                  }}
                >
                  Current Template:
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#0369a1",
                  }}
                >
                  {selectedField.defaultValue}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#6b7280",
                    marginTop: "4px",
                  }}
                >
                  Preview:{" "}
                  {processTemplateValue(
                    selectedField.defaultValue,
                    buildTemplateContext()
                  )}
                </div>
              </div>
            )}
        </div>
      )}

      {/* PREVIEW DEBUG BAR */}
      {previewMode && (
        <div
          style={{
            padding: "8px 24px",
            // backgroundColor: "#f3f4f6",
            fontSize: "12px",
            borderBottom: "1px solid #e5e7eb",
            color: "#6b7280",
            display: "flex",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <div>
            <strong>Debug:</strong> Page {currentStepIndex + 1}/
            {parsedSteps.length}
          </div>
          <div>
            <strong>Fields Filled:</strong> {Object.keys(previewData).length}
          </div>
          {currentStep && currentStep.navigationRule && (
            <div>
              <strong>Navigation:</strong> {getNextStepLogic()}
            </div>
          )}
          <div style={{ marginLeft: "auto" }}>
            <strong>Mode:</strong>{" "}
            <span style={{ color: "#10b981" }}>Preview Active</span>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA - Three Panel Layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT PANEL - Field Types Palette (Edit Mode Only) */}
        {!previewMode && (
          <div
            style={{
              width: "280px",
              // backgroundColor: "#f8fafc",
              borderRight: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>
              <h3
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1f2937",
                }}
              >
                Add Field Types
              </h3>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                Drag or click to add fields to your form
              </div>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
              <div
                style={{
                  display: "grid",
                  gap: "8px",
                  gridTemplateColumns: "1fr 1fr",
                }}
              >
                {FIELD_TYPES.map((fieldType) => (
                  <button
                    key={fieldType.type}
                    onClick={() => addField(fieldType.type)}
                    onDragStart={(e) =>
                      handleDragStart(e, {
                        type: "fieldType",
                        fieldType: fieldType.type,
                      })
                    }
                    draggable
                    style={{
                      padding: "12px 8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      // backgroundColor: "white",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      fontWeight: "500",
                      color: "#374151",
                      transition: "all 0.2s",
                      textAlign: "center",
                      minHeight: "70px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#0ea5e9";
                      // e.currentTarget.style.backgroundColor = "#f0f9ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#d1d5db";
                      // e.currentTarget.style.backgroundColor = "white";
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{fieldType.icon}</span>
                    <span>{fieldType.label}</span>
                  </button>
                ))}
              </div>

              {/* Clipboard Actions */}
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  onClick={pasteFieldFromClipboard}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    // backgroundColor: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#374151",
                  }}
                >
                  📋 Paste Field
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CENTER PANEL - Form Canvas */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            // backgroundColor: "white",
          }}
        >
          {/* Current Step Header */}
          {currentStep && (
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #e5e7eb",
                // backgroundColor: "#f9fafb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <input
                  type="text"
                  value={currentStep.name}
                  onChange={(e) => updateStepProperty("name", e.target.value)}
                  disabled={previewMode}
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    border: previewMode ? "none" : "1px solid #d1d5db",
                    borderRadius: "4px",
                    padding: previewMode ? "0" : "6px 8px",
                    // backgroundColor: previewMode ? "transparent" : "white",
                    color: "#1f2937",
                    width: "300px",
                  }}
                  placeholder="Page Name"
                />

                {!previewMode && (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      {currentStep.fields.length} field
                      {currentStep.fields.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              <textarea
                value={currentStep.description}
                onChange={(e) =>
                  updateStepProperty("description", e.target.value)
                }
                disabled={previewMode}
                style={{
                  width: "92%",
                  minHeight: "40px",
                  border: previewMode ? "none" : "1px solid #d1d5db",
                  borderRadius: "4px",
                  padding: previewMode ? "0" : "6px 8px",
                  // backgroundColor: previewMode ? "transparent" : "white",
                  fontSize: "13px",
                  color: "#6b7280",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                placeholder="Page description (optional)"
              />
            </div>
          )}

          {/* Form Fields Canvas */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "24px",
              minHeight: "400px",
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {!currentStep ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px",
                  color: "#9ca3af",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
                <div style={{ fontSize: "16px", marginBottom: "8px" }}>
                  No Page Selected
                </div>
                <div style={{ fontSize: "14px" }}>
                  Create a new flow or select a page to start building
                </div>
              </div>
            ) : currentStep.fields.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px",
                  border: "2px dashed #d1d5db",
                  borderRadius: "12px",
                  color: "#9ca3af",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>✨</div>
                <div
                  style={{
                    fontSize: "16px",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  {previewMode
                    ? "No fields to preview"
                    : "Start Building Your Form"}
                </div>
                <div style={{ fontSize: "14px", marginBottom: "16px" }}>
                  {previewMode
                    ? "Switch to edit mode to add fields"
                    : "Add fields from the left panel or drag them here"}
                </div>
                {!previewMode && (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => addField("text")}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#0ea5e9",
                        // color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    >
                      + Text Field
                    </button>
                    <button
                      onClick={() => addField("select")}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#10b981",
                        // color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    >
                      + Dropdown
                    </button>
                    <button
                      onClick={() => addField("textarea")}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#8b5cf6",
                        // color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    >
                      + Long Text
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Render Form Fields */
              <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                {currentStep.fields.map((field: FormField, index: number) => {
                  const isVisible = isFieldVisible(field);
                  const fieldValue = renderFieldValue(
                    field,
                    previewData[field.id]
                  );

                  // Skip rendering if field is not visible in preview mode
                  if (previewMode && !isVisible) return null;

                  return (
                    <div
                      key={field.id}
                      style={{
                        marginBottom: "20px",
                        opacity: !previewMode && !isVisible ? 0.5 : 1,
                        border:
                          selectedFieldId === field.id && !previewMode
                            ? "2px solid #0ea5e9"
                            : "2px solid transparent",
                        borderRadius: "8px",
                        padding:
                          selectedFieldId === field.id && !previewMode
                            ? "12px"
                            : "0",
                        backgroundColor:
                          selectedFieldId === field.id && !previewMode
                            ? "#f0f9ff"
                            : "transparent",
                        position: "relative",
                        transition: "all 0.2s",
                      }}
                      onClick={() =>
                        !previewMode && setSelectedFieldId(field.id)
                      }
                      draggable={!previewMode}
                      onDragStart={(e) =>
                        !previewMode &&
                        handleDragStart(e, { type: "field", field, index })
                      }
                    >
                      {/* Field Controls - Edit Mode Only */}
                      {!previewMode && selectedFieldId === field.id && (
                        <div
                          style={{
                            position: "absolute",
                            top: "-14px",
                            right: "-8px",
                            display: "flex",
                            gap: "4px",
                            zIndex: 10,
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveFieldUp(index);
                            }}
                            disabled={index === 0}
                            style={{
                              width: "24px",
                              height: "24px",
                              backgroundColor:
                                index === 0 ? "#9ca3af" : "#6b7280",
                              // color: "white",
                              border: "none",
                              borderRadius: "50%",
                              cursor: index === 0 ? "not-allowed" : "pointer",
                              fontSize: "12px",
                            }}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveFieldDown(index);
                            }}
                            disabled={index === currentStep.fields.length - 1}
                            style={{
                              width: "24px",
                              height: "24px",
                              backgroundColor:
                                index === currentStep.fields.length - 1
                                  ? "#9ca3af"
                                  : "#6b7280",
                              // color: "white",
                              border: "none",
                              borderRadius: "50%",
                              cursor:
                                index === currentStep.fields.length - 1
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "12px",
                            }}
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyFieldToClipboard(field);
                            }}
                            style={{
                              width: "24px",
                              height: "24px",
                              backgroundColor: "#10b981",
                              // color: "white",
                              border: "none",
                              borderRadius: "50%",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                            title="Copy field"
                          >
                            📋
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${field.title}"?`))
                                deleteField(field.id);
                            }}
                            style={{
                              width: "24px",
                              height: "24px",
                              backgroundColor: "#ef4444",
                              // color: "white",
                              border: "none",
                              borderRadius: "50%",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                            title="Delete field"
                          >
                            ×
                          </button>
                        </div>
                      )}

                      {/* Field Rendering */}
                      {field.type === "title" ? (
                        <div>
                          <h2
                            style={{
                              fontSize: "20px",
                              fontWeight: "600",
                              color: "#1f2937",
                              margin: "0 0 8px 0",
                            }}
                          >
                            {field.title}
                          </h2>
                          {field.placeholder && (
                            <p
                              style={{
                                fontSize: "14px",
                                color: "#6b7280",
                                margin: "0",
                              }}
                            >
                              {field.placeholder}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <label
                            style={{
                              display: "block",
                              fontSize: "14px",
                              fontWeight: "500",
                              color: "#374151",
                              marginBottom: "6px",
                            }}
                          >
                            {field.title}
                            {field.required && (
                              <span style={{ color: "#ef4444" }}>*</span>
                            )}
                          </label>

                          {/* Enhanced Field Input Rendering */}
                          {field.type === "text" && (
                            <input
                              type="text"
                              value={fieldValue || ""}
                              onChange={(e) =>
                                updatePreviewData(field.id, e.target.value)
                              }
                              placeholder={field.placeholder}
                              disabled={field.readOnly}
                              style={{
                                padding: "8px 12px",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                fontSize: "14px",
                              }}
                            />
                          )}

                          {field.type === "textarea" && (
                            <textarea
                              value={fieldValue || ""}
                              onChange={(e) =>
                                updatePreviewData(field.id, e.target.value)
                              }
                              placeholder={field.placeholder}
                              disabled={field.readOnly}
                              rows={4}
                              style={{
                                width: "92%",
                                padding: "8px 12px",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                fontSize: "14px",
                                resize: "vertical",
                                fontFamily: "inherit",
                              }}
                            />
                          )}

                          {field.type === "select" && (
                            <select
                              value={fieldValue || ""}
                              onChange={(e) =>
                                updatePreviewData(field.id, e.target.value)
                              }
                              disabled={field.readOnly}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid #ccc",
                                borderRadius: "6px",
                                fontSize: "14px",
                              }}
                            >
                              <option value="">Choose an option...</option>
                              {field.options?.map((option, optIndex) => (
                                <option key={optIndex} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}

                          {field.type === "radio" && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              {field.options?.map((option, optIndex) => (
                                <label
                                  key={optIndex}
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "8px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={field.id}
                                    value={option}
                                    checked={fieldValue === option}
                                    onChange={(e) =>
                                      updatePreviewData(
                                        field.id,
                                        e.target.value
                                      )
                                    }
                                    disabled={field.readOnly}
                                    style={{ marginTop: "2px" }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "14px",
                                      whiteSpace: "pre-line",
                                      lineHeight: "1.4",
                                    }}
                                  >
                                    {option}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}

                          {field.type === "checkbox" && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              {field.options?.map((option, optIndex) => {
                                const selectedValues = Array.isArray(fieldValue)
                                  ? fieldValue
                                  : [];
                                return (
                                  <label
                                    key={optIndex}
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: "8px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedValues.includes(option)}
                                      onChange={(e) => {
                                        const currentValues = Array.isArray(
                                          fieldValue
                                        )
                                          ? fieldValue
                                          : [];
                                        const newValues = e.target.checked
                                          ? [...currentValues, option]
                                          : currentValues.filter(
                                              (v) => v !== option
                                            );
                                        updatePreviewData(field.id, newValues);
                                      }}
                                      disabled={field.readOnly}
                                      style={{ marginTop: "2px" }}
                                    />
                                    <span
                                      style={{
                                        fontSize: "14px",
                                        whiteSpace: "pre-line",
                                        lineHeight: "1.4",
                                      }}
                                    >
                                      {option}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {field.type === "file" && (
                            <div>
                              <input
                                type="file"
                                onChange={(e) =>
                                  handleFileUpload(field.id, e.target.files)
                                }
                                accept={field.acceptedFileTypes?.join(",")}
                                multiple={field.multiple}
                                disabled={field.readOnly}
                                style={{
                                  padding: "8px 12px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  fontSize: "14px",
                                }}
                              />
                              {field.maxFileSize && (
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#6b7280",
                                    marginTop: "4px",
                                  }}
                                >
                                  Max size: {field.maxFileSize}MB
                                  {field.acceptedFileTypes &&
                                    ` • Types: ${field.acceptedFileTypes.join(
                                      ", "
                                    )}`}
                                </div>
                              )}
                              {fieldValue && (
                                <div
                                  style={{
                                    marginTop: "8px",
                                    fontSize: "12px",
                                    color: "#10b981",
                                  }}
                                >
                                  ✓{" "}
                                  {Array.isArray(fieldValue)
                                    ? `${fieldValue.length} files`
                                    : "1 file"}{" "}
                                  selected
                                </div>
                              )}
                            </div>
                          )}

                          {field.type === "readonly" && (
                            <div
                              style={{
                                padding: "8px 12px",
                                backgroundColor: "#f9fafb",
                                border: "1px solid #e5e7eb",
                                borderRadius: "6px",
                                fontSize: "14px",
                                color: "#374151",
                                whiteSpace: "pre-line",
                                lineHeight: "1.4",
                              }}
                            >
                              {fieldValue ||
                                field.placeholder ||
                                "Read-only content"}
                            </div>
                          )}

                          {/* Conditional visibility indicator */}
                          {!previewMode && (field.dependsOn || !isVisible) && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: isVisible ? "#10b981" : "#ef4444",
                                marginTop: "4px",
                                fontStyle: "italic",
                              }}
                            >
                              {field.dependsOn
                                ? `Depends on: ${field.dependsOn} = "${field.showWhen}"`
                                : "Hidden in preview"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview Navigation Footer */}
          {previewMode && currentStep && (
            <div
              style={{
                padding: "16px 24px",
                backgroundColor: "#f9fafb",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => {
                    if (currentStepIndex > 0) {
                      setCurrentStepIndex(currentStepIndex - 1);
                      setPreviewData({});
                    }
                  }}
                  disabled={currentStepIndex === 0}
                  style={{
                    padding: "8px 16px",
                    backgroundColor:
                      currentStepIndex === 0 ? "#9ca3af" : "#6b7280",
                    // color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: currentStepIndex === 0 ? "not-allowed" : "pointer",
                    fontSize: "14px",
                  }}
                >
                  ← Previous
                </button>
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div>
                  Page {currentStepIndex + 1} of {parsedSteps.length}
                </div>
                {(() => {
                  const validation = validateCurrentStep();
                  return validation.errors.length > 0 ? (
                    <div
                      style={{ color: "#ef4444" }}
                      title={validation.errors.join("\n")}
                    >
                      ⚠️ {validation.errors.length} error
                      {validation.errors.length > 1 ? "s" : ""}
                    </div>
                  ) : (
                    <div style={{ color: "#10b981" }}>✓ Valid</div>
                  );
                })()}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={executeNavigation}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#0ea5e9",
                    // color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  {currentStepIndex === parsedSteps.length - 1
                    ? "Complete Form"
                    : "Next →"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Field Configuration (Edit Mode Only) */}
        {!previewMode && selectedField && (
          <div
            style={{
              width: "320px",
              backgroundColor: "#f8fafc",
              borderLeft: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              maxHeight: "100%",
            }}
          >
            <div style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>
              <h3
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1f2937",
                }}
              >
                Field Configuration
              </h3>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                Configure the selected field properties
              </div>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {/* Field Type */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "4px",
                    }}
                  >
                    Field Type
                  </label>
                  <select
                    value={selectedField.type}
                    onChange={(e) =>
                      updateField(selectedField.id, {
                        type: e.target.value as FormField["type"],
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type.type} value={type.type}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "4px",
                    }}
                  >
                    Title/Label
                  </label>
                  <input
                    type="text"
                    value={selectedField.title}
                    onChange={(e) =>
                      updateField(selectedField.id, { title: e.target.value })
                    }
                    style={{
                      padding: "6px 8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  />
                </div>

                {/* Required */}
                {selectedField.type !== "title" && (
                  <div>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedField.required}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            required: e.target.checked,
                          })
                        }
                      />
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Required Field
                      </span>
                    </label>
                  </div>
                )}

                {/* Placeholder */}
                {["text", "textarea"].includes(selectedField.type) && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      width: "100%",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "4px",
                      }}
                    >
                      Placeholder Text
                    </label>
                    <input
                      type="text"
                      value={selectedField.placeholder || ""}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          placeholder: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    />
                  </div>
                )}

                {/* Options */}
                {["select", "radio", "checkbox"].includes(
                  selectedField.type
                ) && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "12px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Options (one per line)
                      </label>
                    </div>
                    <textarea
                      value={selectedField.options?.join("\n") || ""}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          options: parseFieldOptions(e.target.value),
                        })
                      }
                      rows={4}
                      style={{
                        width: "92%",
                        padding: "6px 8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                  </div>
                )}

                {/* Default Value */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "12px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Default Value
                    </label>
                    <button
                      onClick={() => setShowTemplateHelper(true)}
                      style={{
                        padding: "2px 6px",
                        backgroundColor: "#fef3c7",
                        border: "1px solid #f59e0b",
                        borderRadius: "3px",
                        fontSize: "10px",
                        color: "#92400e",
                        cursor: "pointer",
                      }}
                    >
                      Templates
                    </button>
                  </div>

                  {selectedField.type === "textarea" ? (
                    <textarea
                      value={""}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          defaultValue: e.target.value,
                        })
                      }
                      rows={3}
                      style={{
                        width: "92%",
                        padding: "6px 8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                      placeholder="Default text or #template"
                    />
                  ) : selectedField.type === "checkbox" ? (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6b7280",
                        fontStyle: "italic",
                      }}
                    >
                      Checkbox values are managed through options
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={""}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          defaultValue: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                      placeholder="Default value or #template"
                    />
                  )}

                  {/* Template preview */}
                  {selectedField &&
                    typeof selectedField.defaultValue === "string" &&
                    selectedField.defaultValue.startsWith("#") && (
                      <div
                        style={{
                          marginTop: "4px",
                          padding: "4px 6px",
                          backgroundColor: "#f0f9ff",
                          border: "1px solid #bae6fd",
                          borderRadius: "3px",
                          fontSize: "10px",
                          color: "#0369a1",
                        }}
                      >
                        Preview:{" "}
                        {processTemplateValue(
                          selectedField.defaultValue,
                          buildTemplateContext()
                        )}
                      </div>
                    )}
                </div>

                {/* Read Only */}
                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedField.readOnly}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          readOnly: e.target.checked,
                        })
                      }
                    />
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Read Only
                    </span>
                  </label>
                </div>

                {/* Field Dependencies */}
                {dependencySourceFields.length > 0 && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "4px",
                      }}
                    >
                      Show When (Conditional)
                    </label>

                    <select
                      value={selectedField.dependsOn || ""}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          dependsOn: e.target.value || undefined,
                          showWhen: e.target.value ? "" : undefined,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "12px",
                        marginBottom: "8px",
                      }}
                    >
                      <option value="">Always show</option>
                      {dependencySourceFields.map((depField) => (
                        <option key={depField.id} value={depField.id}>
                          Depends on: {depField.title}
                        </option>
                      ))}
                    </select>

                    {selectedField.dependsOn && (
                      <input
                        type="text"
                        value={selectedField.showWhen || ""}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            showWhen: e.target.value,
                          })
                        }
                        placeholder="Value to show this field"
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      />
                    )}
                  </div>
                )}

                {/* File Upload Settings */}
                {selectedField.type === "file" && (
                  <>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: "500",
                          color: "#374151",
                          marginBottom: "4px",
                        }}
                      >
                        Accepted File Types
                      </label>
                      <input
                        type="text"
                        value={
                          selectedField.acceptedFileTypes?.join(", ") || ""
                        }
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            acceptedFileTypes: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="image/*, .pdf, .doc"
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: "500",
                          color: "#374151",
                          marginBottom: "4px",
                        }}
                      >
                        Max File Size (MB)
                      </label>
                      <input
                        type="number"
                        value={selectedField.maxFileSize || 10}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            maxFileSize: parseInt(e.target.value),
                          })
                        }
                        min={1}
                        max={100}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedField.multiple}
                          onChange={(e) =>
                            updateField(selectedField.id, {
                              multiple: e.target.checked,
                            })
                          }
                        />
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Allow Multiple Files
                        </span>
                      </label>
                    </div>
                  </>
                )}

                {/* Field Actions */}
                <div
                  style={{
                    marginTop: "16px",
                    paddingTop: "16px",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <button
                    onClick={() => copyFieldToClipboard(selectedField)}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#10b981",
                      // color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "500",
                    }}
                  >
                    📋 Copy Field
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete "${selectedField.title}"?`)) {
                        deleteField(selectedField.id);
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#ef4444",
                      // color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "500",
                    }}
                  >
                    🗑️ Delete Field
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* JSON Output Modal */}
      {jsonOutput && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "80vw",
              maxHeight: "80vh",
              overflow: "auto",
              backgroundColor: "#ffffff",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "18px" }}>Generated Schema</h2>
              <button
                onClick={() => setJsonOutput("")}
                style={{
                  backgroundColor: "#f3f4f6",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <pre
              style={{
                padding: "16px",
                borderRadius: "6px",
                fontSize: "12px",
                overflow: "auto",
                maxHeight: "60vh",
                border: "1px solid #e2e8f0",
              }}
            >
              {jsonOutput}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(jsonOutput)}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                backgroundColor: "#0ea5e9",
                // color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              📋 Copy to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Export the main component
export default FormBuilder;
