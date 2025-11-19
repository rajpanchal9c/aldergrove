// Mock implementation of base44 client using localStorage

const STORAGE_KEY = "family_tree_data";

const getMembers = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

const saveMembers = (members: any[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
};

export const base44 = {
    entities: {
        FamilyMember: {
            list: async (sort?: string) => {
                return getMembers();
            },
            create: async (data: any) => {
                const members = getMembers();
                const newMember = { ...data, id: Math.random().toString(36).substr(2, 9), created_date: new Date().toISOString() };
                members.push(newMember);
                saveMembers(members);
                return newMember;
            },
            bulkCreate: async (data: any[]) => {
                const members = getMembers();
                const newMembers = data.map(d => ({ ...d, id: Math.random().toString(36).substr(2, 9), created_date: new Date().toISOString() }));
                members.push(...newMembers);
                saveMembers(members);
                return newMembers;
            },
            update: async (id: string, data: any) => {
                const members = getMembers();
                const index = members.findIndex((m: any) => m.id === id);
                if (index !== -1) {
                    members[index] = { ...members[index], ...data };
                    saveMembers(members);
                    return members[index];
                }
                throw new Error("Member not found");
            },
            delete: async (id: string) => {
                const members = getMembers();
                const filtered = members.filter((m: any) => m.id !== id);
                saveMembers(filtered);
                return { success: true };
            },
        },
    },
    integrations: {
        Core: {
            UploadFile: async ({ file }: { file: File }) => {
                // Mock upload - just return a fake URL or base64
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({ file_url: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                });
            },
            ExtractDataFromUploadedFile: async ({ file_url }: { file_url: string }) => {
                // Mock extraction - return empty array or some dummy data
                return { data: [] };
            },
        },
    },
};
