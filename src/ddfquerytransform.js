import { deepmerge } from "./utils";

// only on base level now, should be recursive
export function dotToJoin(query) {
    const props = query.where && Object.keys(query.where);
    if (!props || props.length == 0)
        return query;

    const where = query.where,
        newq = deepmerge({}, query);

    let i = 0;

    props.forEach(p => {
        const s = p.split('.');
        if (s.length > 1) {
            const [key, value] = s;
            const filter = where[p];

            const joinid = "$" + key + i++;
            delete newq.where[p];

            if (!newq.where["$or"]) newq.where["$or"] = [];
            newq.where["$or"].push({ [key]: joinid });

            if (!newq.join) newq.join = {};
            newq.join[joinid] = {
                key: key,
                where: {
                    [value]: Array.isArray(filter) ? { "$in": filter } : filter
                }
            }
        }
    });

    //restrictive join for permanent filter
    props.forEach(p => {
        if (query.select.key.includes(p)) {
            const filter = where[p];
            
            const joinid = "$" + p + i++;
            delete newq.where[p];

            newq.where[p] = joinid;

            if (!newq.join) newq.join = {};
            newq.join[joinid] = {
                key: p,
                where: filter
            }
        }
    })

    console.log("Transformed query: ", query, newq);
    return newq;
}

// needed for WS
export function addExplicitAnd(query) {
    // return if no where or only single where
    const props = query.where && Object.keys(query.where);
    if (!props || props.length < 2)
        return query;

    const newq = deepmerge({}, query);
    newq.where = {
        "$and": []
    }
    props.forEach(prop => {
        newq.where["$and"].push({
            [prop]: query.where[prop]
        })
    })

    console.log("Transformed query: ", query, newq);
    return newq;
}